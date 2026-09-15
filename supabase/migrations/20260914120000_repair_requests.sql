-- =============================================================================
-- Mail-in repair requests
-- =============================================================================
-- Stores requests from /mail-in-repair/start and their photos.
--
-- SECURITY MODEL
--   * These tables hold customer PII (name, phone, email, ZIP).
--   * The anon key is public by design. anon gets NO select, insert, update,
--     or delete on either table — no grants and no RLS policies.
--   * The public form writes only through two SECURITY DEFINER functions:
--       public.submit_repair_request(payload jsonb)
--       public.attach_repair_photo(request_id uuid, slot text, storage_path text)
--     Both validate their input and set search_path = '' so they can't be
--     hijacked by objects in other schemas.
--   * Helpers live in the `private` schema, which PostgREST does not expose.
--   * Storage bucket `repair-photos` is private. anon may only INSERT, only to
--     `{request_id}/{full|damage|tag}.jpg`, and only for a request created in
--     the last 15 minutes. anon cannot read, update, or delete objects.
--   * `authenticated` gets full access for the admin UI.
--       !! Any signed-in user of this Supabase project counts as authenticated.
--       !! Make sure public sign-ups are disabled (Auth → Providers → Email →
--       !! "Allow new users to sign up" off) before real requests come in.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
-- anon needs USAGE only so the storage upload policy can call its check function.
grant usage on schema private to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Request numbers: WSS-0001, WSS-0002, … (grows past 4 digits, never truncates)
-- -----------------------------------------------------------------------------

create sequence if not exists private.repair_request_number_seq;
revoke all on sequence private.repair_request_number_seq from public, anon, authenticated;

create or replace function private.assign_repair_request_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n bigint := nextval('private.repair_request_number_seq');
begin
  -- Always assigned here; any value supplied by a caller is overwritten.
  new.request_number := 'WSS-' || lpad(n::text, greatest(4, length(n::text)), '0');
  return new;
end;
$$;
revoke all on function private.assign_repair_request_number() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.repair_requests (
  id                      uuid primary key default gen_random_uuid(),
  request_number          text unique not null,  -- unique constraint doubles as the request_number index
  created_at              timestamptz not null default now(),
  status                  text not null default 'new'
                          check (status in ('new', 'contacted', 'quoted', 'approved', 'in_shop', 'shipped_back', 'closed', 'declined')),
  category                text check (category in ('tent', 'shade', 'seat', 'other')),
  item_details            jsonb,       -- the branched step 2 answers
  damage_types            text[],
  damage_notes            text,
  replacement_value       integer check (replacement_value >= 0),
  spend_ceiling           integer check (spend_ceiling >= 0),
  if_unrepairable         text check (if_unrepairable in ('return', 'dispose')),
  clean_dry_confirmed     boolean,
  ship_zip                text check (ship_zip ~ '^[0-9]{5}$'),
  ship_residential        boolean,
  box_length              integer,
  box_width               integer,
  box_height              integer,
  box_weight              integer,
  billable_weight         integer,
  -- Estimates exactly as the customer saw them. Never recompute on read:
  -- the zone table and price bands will change.
  repair_estimate_low     integer,
  repair_estimate_high    integer,
  shipping_estimate_low   integer,
  shipping_estimate_high  integer,
  estimate_source         text check (estimate_source in ('table', 'easypost', 'shippo')),
  timing_preference       text,
  contact_name            text not null,
  contact_phone           text not null,
  contact_email           text not null,
  contact_method          text check (contact_method in ('phone', 'email')),
  contact_best_time       text,
  referral_source         text,
  referral_detail         text,
  raw_payload             jsonb not null,  -- entire form state, unmodified
  internal_notes          text,            -- admin only; never written by the form
  -- Idempotency key generated once per form session in the browser. A retry
  -- after a lost response returns the existing row instead of inserting a
  -- duplicate.
  client_submission_id    uuid unique
);

create index if not exists repair_requests_status_created_at_idx
  on public.repair_requests (status, created_at desc);

drop trigger if exists repair_requests_assign_number on public.repair_requests;
create trigger repair_requests_assign_number
  before insert on public.repair_requests
  for each row execute function private.assign_repair_request_number();

create table if not exists public.repair_photos (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.repair_requests (id) on delete cascade,
  slot          text not null check (slot in ('full', 'damage', 'tag')),
  storage_path  text not null,
  created_at    timestamptz not null default now(),
  unique (request_id, slot)  -- one photo per slot; also indexes request_id
);

-- -----------------------------------------------------------------------------
-- Row level security: anon gets nothing, authenticated gets everything
-- -----------------------------------------------------------------------------

alter table public.repair_requests enable row level security;
alter table public.repair_photos enable row level security;

-- Supabase grants anon table privileges by default; take them away explicitly.
revoke all on table public.repair_requests from anon, public;
revoke all on table public.repair_photos from anon, public;

grant select, insert, update, delete on table public.repair_requests to authenticated;
grant select, insert, update, delete on table public.repair_photos to authenticated;

drop policy if exists "Authenticated users have full access to repair requests" on public.repair_requests;
create policy "Authenticated users have full access to repair requests"
  on public.repair_requests for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users have full access to repair photos" on public.repair_photos;
create policy "Authenticated users have full access to repair photos"
  on public.repair_photos for all to authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Validation helpers (private; callable only from the functions below)
-- -----------------------------------------------------------------------------

-- Every validation error uses SQLSTATE 22023 with the offending field in DETAIL,
-- so the form can send the customer to the right step.
create or replace function private.rr_fail(field text, message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '22023', message = message, detail = field;
end;
$$;

create or replace function private.rr_text(payload jsonb, field text, max_len integer, required boolean, message text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v jsonb := payload -> field;
  s text;
begin
  if v is null or v = 'null'::jsonb then
    if required then perform private.rr_fail(field, message); end if;
    return null;
  end if;
  if jsonb_typeof(v) <> 'string' then perform private.rr_fail(field, message); end if;
  s := btrim(v #>> '{}');
  if s = '' then
    if required then perform private.rr_fail(field, message); end if;
    return null;
  end if;
  if length(s) > max_len then perform private.rr_fail(field, message); end if;
  return s;
end;
$$;

create or replace function private.rr_int(payload jsonb, field text, min_val integer, max_val integer, required boolean, message text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v jsonb := payload -> field;
  n numeric;
begin
  if v is null or v = 'null'::jsonb then
    if required then perform private.rr_fail(field, message); end if;
    return null;
  end if;
  if jsonb_typeof(v) <> 'number' then perform private.rr_fail(field, message); end if;
  n := (v #>> '{}')::numeric;
  if n <> trunc(n) or n < min_val or n > max_val then perform private.rr_fail(field, message); end if;
  return n::integer;
end;
$$;

create or replace function private.rr_bool(payload jsonb, field text, message text)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v jsonb := payload -> field;
begin
  if v is null or jsonb_typeof(v) <> 'boolean' then perform private.rr_fail(field, message); end if;
  return (v #>> '{}')::boolean;
end;
$$;

revoke all on function private.rr_fail(text, text) from public, anon, authenticated;
revoke all on function private.rr_text(jsonb, text, integer, boolean, text) from public, anon, authenticated;
revoke all on function private.rr_int(jsonb, text, integer, integer, boolean, text) from public, anon, authenticated;
revoke all on function private.rr_bool(jsonb, text, text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- submit_repair_request — the only way the public form creates a request
-- -----------------------------------------------------------------------------
-- Reads an allowlist of keys from the payload. Anything else — including
-- status, internal_notes, request_number, id, created_at — is ignored.

create or replace function public.submit_repair_request(payload jsonb)
returns table (id uuid, request_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id          uuid;
  v_id                 uuid;
  v_number             text;
  v_elapsed            jsonb;
  -- validated values, in form-step order
  v_category           text;
  v_item_details       jsonb;
  v_damage_types       text[];
  v_damage_notes       text;
  v_replacement_value  integer;
  v_spend_ceiling      integer;
  v_if_unrepairable    text;
  v_ship_zip           text;
  v_ship_residential   boolean;
  v_box_length         integer;
  v_box_width          integer;
  v_box_height         integer;
  v_box_weight         integer;
  v_billable_weight    integer;
  v_timing             text;
  v_repair_low         integer;
  v_repair_high        integer;
  v_ship_low           integer;
  v_ship_high          integer;
  v_estimate_source    text;
  v_contact_name       text;
  v_contact_phone      text;
  v_contact_email      text;
  v_contact_method     text;
  v_contact_best_time  text;
  v_referral_source    text;
  v_referral_detail    text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    perform private.rr_fail('payload', 'The request was empty. Refresh the page and try again.');
  end if;
  if octet_length(payload::text) > 200000 then
    perform private.rr_fail('payload', 'The request was too large to save.');
  end if;

  -- Spam checks: a hidden field real people never fill, and a minimum time on the form.
  if coalesce(payload ->> 'website', '') <> '' then
    perform private.rr_fail('spam_check', 'The request could not be accepted.');
  end if;
  v_elapsed := payload -> 'form_elapsed_ms';
  if v_elapsed is null or jsonb_typeof(v_elapsed) <> 'number' or (v_elapsed #>> '{}')::numeric < 10000 then
    perform private.rr_fail('spam_check', 'The request could not be accepted.');
  end if;

  -- Idempotency: a retried submission returns the row it already created.
  if payload ? 'client_submission_id' then
    begin
      v_client_id := (payload ->> 'client_submission_id')::uuid;
    exception when invalid_text_representation then
      perform private.rr_fail('client_submission_id', 'The request was malformed. Refresh the page and try again.');
    end;
    select r.id, r.request_number into v_id, v_number
      from public.repair_requests r
     where r.client_submission_id = v_client_id;
    if found then
      return query select v_id, v_number;
      return;
    end if;
  end if;

  if jsonb_typeof(payload -> 'raw_payload') is distinct from 'object' then
    perform private.rr_fail('raw_payload', 'The request was malformed. Refresh the page and try again.');
  end if;

  -- Step 1
  v_category := payload ->> 'category';
  if v_category is null or v_category not in ('tent', 'shade', 'seat', 'other') then
    perform private.rr_fail('category', 'Choose what you’re sending.');
  end if;

  -- Step 2
  v_item_details := payload -> 'item_details';
  if jsonb_typeof(v_item_details) is distinct from 'object' then
    perform private.rr_fail('item_details', 'Some item details are missing.');
  end if;

  -- Step 3
  if jsonb_typeof(payload -> 'damage_types') is distinct from 'array'
     or jsonb_array_length(payload -> 'damage_types') > 20
     or exists (
       select 1 from jsonb_array_elements(payload -> 'damage_types') e
        where jsonb_typeof(e) <> 'string' or length(e #>> '{}') > 60
     ) then
    perform private.rr_fail('damage_types', 'The damage checklist didn’t come through correctly.');
  end if;
  select coalesce(array_agg(e #>> '{}'), '{}') into v_damage_types
    from jsonb_array_elements(payload -> 'damage_types') e;
  v_damage_notes := private.rr_text(payload, 'damage_notes', 2000, false, 'The damage description is too long.');
  v_repair_low   := private.rr_int(payload, 'repair_estimate_low', 0, 100000, true, 'The repair estimate didn’t come through.');
  v_repair_high  := private.rr_int(payload, 'repair_estimate_high', 0, 100000, true, 'The repair estimate didn’t come through.');

  -- Step 5
  if private.rr_bool(payload, 'clean_dry_confirmed', 'Confirm it will ship clean and dry.') is not true then
    perform private.rr_fail('clean_dry_confirmed', 'Confirm it will ship clean and dry.');
  end if;
  v_spend_ceiling := private.rr_int(payload, 'spend_ceiling', 0, 1000000, false, 'The spending limit isn’t a valid amount.');
  v_if_unrepairable := payload ->> 'if_unrepairable';
  if v_if_unrepairable is null or v_if_unrepairable not in ('return', 'dispose') then
    perform private.rr_fail('if_unrepairable', 'Choose what happens if it can’t be repaired.');
  end if;
  v_replacement_value := private.rr_int(payload, 'replacement_value', 1, 1000000, true, 'Enter a rough replacement cost.');

  -- Step 6
  v_ship_zip := payload ->> 'ship_zip';
  if v_ship_zip is null or v_ship_zip !~ '^[0-9]{5}$' then
    perform private.rr_fail('ship_zip', 'Enter a 5-digit ZIP code.');
  end if;
  v_ship_residential := private.rr_bool(payload, 'ship_residential', 'Choose residential or business.');
  v_box_length      := private.rr_int(payload, 'box_length', 1, 108, true, 'Check the box length.');
  v_box_width       := private.rr_int(payload, 'box_width', 1, 108, true, 'Check the box width.');
  v_box_height      := private.rr_int(payload, 'box_height', 1, 108, true, 'Check the box height.');
  v_box_weight      := private.rr_int(payload, 'box_weight', 1, 150, true, 'Check the box weight.');
  v_billable_weight := private.rr_int(payload, 'billable_weight', 1, 1000, true, 'Check the box size and weight.');
  v_ship_low        := private.rr_int(payload, 'shipping_estimate_low', 0, 100000, true, 'The shipping estimate didn’t come through.');
  v_ship_high       := private.rr_int(payload, 'shipping_estimate_high', 0, 100000, true, 'The shipping estimate didn’t come through.');
  v_estimate_source := payload ->> 'estimate_source';
  if v_estimate_source is null or v_estimate_source not in ('table', 'easypost', 'shippo') then
    perform private.rr_fail('estimate_source', 'The shipping estimate didn’t come through.');
  end if;
  v_timing := private.rr_text(payload, 'timing_preference', 40, true, 'Pick when you’re hoping to send it.');

  -- Step 7
  v_contact_name  := private.rr_text(payload, 'contact_name', 200, true, 'Enter your name.');
  v_contact_phone := private.rr_text(payload, 'contact_phone', 40, true, 'Enter a phone number with the area code.');
  if length(regexp_replace(v_contact_phone, '[^0-9]', '', 'g')) not in (10, 11) then
    perform private.rr_fail('contact_phone', 'Enter a 10-digit phone number with the area code.');
  end if;
  v_contact_email := private.rr_text(payload, 'contact_email', 254, true, 'Enter your email address.');
  if v_contact_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then
    perform private.rr_fail('contact_email', 'That email address looks incomplete.');
  end if;
  v_contact_method := payload ->> 'contact_method';
  if v_contact_method is null or v_contact_method not in ('phone', 'email') then
    perform private.rr_fail('contact_method', 'Choose how you’d like me to reach you.');
  end if;
  v_contact_best_time := private.rr_text(payload, 'contact_best_time', 40, true, 'Choose the best time to reach you.');
  v_referral_source   := private.rr_text(payload, 'referral_source', 40, false, 'Choose how you found me, or leave it blank.');
  v_referral_detail   := private.rr_text(payload, 'referral_detail', 200, false, 'That note is too long.');

  begin
    insert into public.repair_requests (
      category, item_details, damage_types, damage_notes,
      replacement_value, spend_ceiling, if_unrepairable, clean_dry_confirmed,
      ship_zip, ship_residential,
      box_length, box_width, box_height, box_weight, billable_weight,
      repair_estimate_low, repair_estimate_high, shipping_estimate_low, shipping_estimate_high, estimate_source,
      timing_preference,
      contact_name, contact_phone, contact_email, contact_method, contact_best_time,
      referral_source, referral_detail,
      raw_payload, client_submission_id
    )
    values (
      v_category, v_item_details, v_damage_types, v_damage_notes,
      v_replacement_value, v_spend_ceiling, v_if_unrepairable, true,
      v_ship_zip, v_ship_residential,
      v_box_length, v_box_width, v_box_height, v_box_weight, v_billable_weight,
      v_repair_low, v_repair_high, v_ship_low, v_ship_high, v_estimate_source,
      v_timing,
      v_contact_name, v_contact_phone, v_contact_email, v_contact_method, v_contact_best_time,
      v_referral_source, v_referral_detail,
      payload -> 'raw_payload', v_client_id
    )
    returning repair_requests.id, repair_requests.request_number into v_id, v_number;
  exception
    -- Two clicks racing with the same client_submission_id: return the one that won.
    when unique_violation then
      if v_client_id is null then raise; end if;
      select r.id, r.request_number into v_id, v_number
        from public.repair_requests r
       where r.client_submission_id = v_client_id;
      if not found then raise; end if;
  end;

  return query select v_id, v_number;
end;
$$;

revoke all on function public.submit_repair_request(jsonb) from public;
grant execute on function public.submit_repair_request(jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Photos
-- -----------------------------------------------------------------------------

-- Storage policy check: is `object_name` a valid `{request_id}/{slot}.jpg` for a
-- request created in the last 15 minutes? SECURITY DEFINER because anon can't
-- read repair_requests. Returns only a boolean for an unguessable UUID.
create or replace function private.repair_photo_upload_allowed(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if object_name is null
     or object_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(full|damage|tag)\.jpg$' then
    return false;
  end if;
  return exists (
    select 1 from public.repair_requests r
     where r.id = split_part(object_name, '/', 1)::uuid
       and r.created_at > now() - interval '15 minutes'
  );
end;
$$;
revoke all on function private.repair_photo_upload_allowed(text) from public;
grant execute on function private.repair_photo_upload_allowed(text) to anon, authenticated;

create or replace function public.attach_repair_photo(request_id uuid, slot text, storage_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created timestamptz;
begin
  if attach_repair_photo.slot is null or attach_repair_photo.slot not in ('full', 'damage', 'tag') then
    perform private.rr_fail('slot', 'Unknown photo slot.');
  end if;

  select r.created_at into v_created
    from public.repair_requests r
   where r.id = attach_repair_photo.request_id;
  if not found then
    perform private.rr_fail('request_id', 'That request doesn’t exist.');
  end if;
  -- Only fresh requests: the RPC can't be used to attach to old records.
  if v_created < now() - interval '15 minutes' then
    perform private.rr_fail('request_id', 'Photos can only be attached right after a request is sent.');
  end if;

  if attach_repair_photo.storage_path is distinct from
     attach_repair_photo.request_id::text || '/' || attach_repair_photo.slot || '.jpg' then
    perform private.rr_fail('storage_path', 'The photo path doesn’t match the request.');
  end if;
  if not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'repair-photos' and o.name = attach_repair_photo.storage_path
  ) then
    perform private.rr_fail('storage_path', 'That photo hasn’t been uploaded.');
  end if;

  insert into public.repair_photos (request_id, slot, storage_path)
  values (attach_repair_photo.request_id, attach_repair_photo.slot, attach_repair_photo.storage_path)
  on conflict on constraint repair_photos_request_id_slot_key do nothing;
end;
$$;

revoke all on function public.attach_repair_photo(uuid, text, text) from public;
grant execute on function public.attach_repair_photo(uuid, text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Storage: private bucket, anon insert-only into a fresh request's folder
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'repair-photos', 'repair-photos', false,
  15 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anon can upload photos to a fresh repair request" on storage.objects;
create policy "Anon can upload photos to a fresh repair request"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'repair-photos'
    and private.repair_photo_upload_allowed(name)
  );

-- No anon select/update/delete policies exist for this bucket: anon can't read,
-- list, overwrite, or remove photos. Admin reads via signed URLs.
drop policy if exists "Authenticated users can read repair photos" on storage.objects;
create policy "Authenticated users can read repair photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'repair-photos');

drop policy if exists "Authenticated users can delete repair photos" on storage.objects;
create policy "Authenticated users can delete repair photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'repair-photos');

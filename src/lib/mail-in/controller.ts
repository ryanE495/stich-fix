/**
 * Browser controller for the mail-in repair request form.
 *
 * This is a request form, not a checkout: nothing is charged and nothing ships
 * until there's been a phone call. The controller owns form state (in memory
 * only — it resets on refresh by design), wires DOM events to state, and
 * re-renders from state. Every business rule is a call into rules.ts.
 *
 * Network-shaped work:
 *   - shipping-estimate.ts  getShippingEstimate() → /api/shipping-estimate (EasyPost), never throws
 *   - submit.ts             submitRepairRequest() → Supabase RPC + photo uploads (anon key only)
 */

import {
  BEST_TIMES,
  CARRIER_LIMITS,
  CATEGORIES,
  CONTACT_METHODS,
  CUSTOM_BOX_ID,
  FOUND_VIA,
  MINIMUM_USD,
  PHOTO_SLOTS,
  REQUEST_SUBMIT,
  SEAT_SENDING,
  SEAT_SENDING_PRESET,
  SEAT_TYPES,
  SHADE_TYPES,
  STEP_COUNT,
  STEP_TITLES,
  TENT_AGES,
  TENT_TYPES,
  UNREPAIRABLE_CHOICES,
  optionLabel,
} from '../../config/mail-in-intake';
import {
  assessPackage,
  buildEstimateRequest,
  buildPayload,
  canPreviewImage,
  combinedEstimateRange,
  createInitialState,
  estimateRepair,
  estimateRequestKey,
  firstInvalidStep,
  formatPhone,
  formatShippingEstimate,
  formatUsd,
  formatUsdRange,
  isCategory,
  isImageFile,
  normalizePhone,
  presetFor,
  toNumber,
  validateStep,
} from './rules';
import { compressPhotos } from './compress-photo';
import { getSendWeekOptions } from './send-weeks';
import { getShippingEstimate } from './shipping-estimate';
import { roughShippingEstimate } from './shipping-zones';
import { buildRepairRequestPayload, spokenRequestNumber } from './repair-request-payload';
import { SubmitError, submitRepairRequest } from './submit';
import type {
  EstimateStatus,
  IntakePayload,
  PhotoSlotId,
  ShippingEstimate,
  StepNumber,
  StepValidation,
  SubmitFailure,
  SubmitResult,
} from './types';

const ESTIMATE_DEBOUNCE_MS = 400;
const SHIPPING_STEP: StepNumber = 6;
const REVIEW_STEP = STEP_COUNT as StepNumber;
const DIM_FIELDS = ['shipping.length', 'shipping.width', 'shipping.height', 'shipping.weight'];

export function initIntakeForm(root: HTMLElement): void {
  const formEl = root.querySelector<HTMLFormElement>('[data-intake-form]');
  const doneEl = root.querySelector<HTMLElement>('[data-intake-done]');
  if (!formEl || !doneEl) return;
  // Re-bound as non-null so nested functions keep the narrowed type.
  const form: HTMLFormElement = formEl;
  const done: HTMLElement = doneEl;

  const phone = root.dataset.phone ?? '';
  const supabaseTarget =
    root.dataset.supabaseUrl && root.dataset.supabaseAnonKey
      ? { url: root.dataset.supabaseUrl, anonKey: root.dataset.supabaseAnonKey }
      : null;

  // ---- state ---------------------------------------------------------------
  const state = createInitialState();
  const startedAt = performance.now();
  /** One per page load. A retry reuses it, so a lost response or a double send can't make two requests. */
  const clientSubmissionId = newUuid();
  const sendWeeks = getSendWeekOptions();
  let step: StepNumber = 1;
  let estimate: EstimateStatus = { state: 'idle' };
  const touched = new Set<string>();
  const attempted = new Set<StepNumber>();
  const photoErrors: Partial<Record<PhotoSlotId, string>> = {};
  const photoUrls: Partial<Record<PhotoSlotId, string>> = {};
  let returnToReview = false;
  let submitting = false;
  let submitError = '';
  /** Step the customer can go back to after the database rejects a field. */
  let submitErrorStep: StepNumber | null = null;
  let estimateTimer: number | undefined;
  let estimateSeq = 0;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- DOM helpers ---------------------------------------------------------
  const q = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) => scope.querySelector<T>(sel);
  const qa = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = root) => Array.from(scope.querySelectorAll<T>(sel));
  const out = (name: string) => q(`[data-out="${name}"]`);
  const section = (n: StepNumber) => q(`section[data-step="${n}"]`)!;
  const byName = (name: string) => qa<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`, form);

  function setText(name: string, text: string) {
    const el = out(name);
    if (el) el.textContent = text;
  }

  function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, string> = {},
    ...children: (Node | string | null | undefined)[]
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') el.className = v;
      else el.setAttribute(k, v);
    }
    for (const c of children) if (c !== null && c !== undefined) el.append(c);
    return el;
  }

  /** Set a state field by input name. Only paths that already exist in state are writable. */
  function setField(name: string, value: string | boolean): boolean {
    const parts = name.split('.');
    let target = state as unknown as Record<string, unknown>;
    for (const part of parts.slice(0, -1)) {
      if (!Object.prototype.hasOwnProperty.call(target, part)) return false;
      const next = target[part];
      if (typeof next !== 'object' || next === null) return false;
      target = next as Record<string, unknown>;
    }
    const leaf = parts[parts.length - 1];
    if (!Object.prototype.hasOwnProperty.call(target, leaf) || typeof target[leaf] !== typeof value) return false;
    target[leaf] = value;
    return true;
  }

  function checkRadio(name: string, value: string) {
    for (const el of byName(name)) if (el instanceof HTMLInputElement) el.checked = el.value === value;
  }

  function syncValue(name: string, value: string) {
    for (const el of byName(name)) el.value = value;
  }

  // ---- events --------------------------------------------------------------
  function onFieldEvent(e: Event) {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    const name = el.name;
    if (!name) return;

    if (el instanceof HTMLInputElement && el.type === 'file') {
      if (e.type === 'change') handlePhoto(el);
      return;
    }

    const isToggle = el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');
    const isSelect = el instanceof HTMLSelectElement;
    // Text fields update on every keystroke; toggles and selects on change.
    if ((isToggle || isSelect) !== (e.type === 'change')) return;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      if (name.startsWith('damage.')) {
        const cat = name.slice('damage.'.length);
        if (!isCategory(cat)) return;
        const list = state.damage[cat];
        const i = list.indexOf(el.value);
        if (el.checked && i === -1) list.push(el.value);
        if (!el.checked && i !== -1) list.splice(i, 1);
      } else {
        setField(name, el.checked);
      }
      touched.add(name);
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (!el.checked) return;
      setField(name, el.value);
      touched.add(name);
      if (name === 'category') onCategoryChange();
      if (name === 'shipping.presetId') applyPreset(el.value);
    } else {
      setField(name, el.value);
      if (isSelect) touched.add(name);
      if (DIM_FIELDS.includes(name)) detachPresetIfEdited();
    }

    scheduleEstimate();
    render();
  }

  function onFocusOut(e: FocusEvent) {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;
    if (!el.name || el.type === 'file') return;
    // Tidy a valid phone number into (970) 555-0123 once they leave the field.
    if (el.name === 'contact.phone') {
      const digits = normalizePhone(el.value);
      if (digits) {
        el.value = formatPhone(digits);
        setField('contact.phone', el.value);
      }
    }
    if (!touched.has(el.name)) {
      touched.add(el.name);
      render();
    }
  }

  function onClick(e: MouseEvent) {
    const target = (e.target as Element).closest<HTMLElement>('[data-action]');
    if (!target || !root.contains(target)) return;
    if (submitting) return;
    switch (target.dataset.action) {
      case 'back':
        if (step > 1) goTo((step - 1) as StepNumber);
        break;
      case 'go-step':
        if (submitErrorStep !== null) {
          const n = submitErrorStep;
          submitError = '';
          submitErrorStep = null;
          attempted.add(n);
          returnToReview = true;
          goTo(n);
        }
        break;
      case 'edit': {
        const n = Number(target.dataset.editStep);
        if (n >= 1 && n < REVIEW_STEP) {
          returnToReview = true;
          goTo(n as StepNumber);
        }
        break;
      }
      case 'remove-photo': {
        const slot = target.dataset.slot as PhotoSlotId | undefined;
        if (slot) removePhoto(slot);
        break;
      }
    }
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (step < REVIEW_STEP) goContinue();
    else void submit();
  }

  // ---- field side effects --------------------------------------------------
  function onCategoryChange() {
    const { presetId } = state.shipping;
    if (presetId && presetId !== CUSTOM_BOX_ID && !presetFor(state.category, presetId)) {
      state.shipping.presetId = '';
      checkRadio('shipping.presetId', '');
    }
  }

  function applyPreset(id: string) {
    const preset = presetFor(state.category, id);
    if (!preset) return;
    const values: Record<string, string> = {
      'shipping.length': String(preset.lengthIn),
      'shipping.width': String(preset.widthIn),
      'shipping.height': String(preset.heightIn),
      'shipping.weight': String(preset.weightLb),
    };
    for (const [name, value] of Object.entries(values)) {
      setField(name, value);
      syncValue(name, value);
    }
  }

  /** Editing a preset's numbers turns the choice into "I'll measure mine". */
  function detachPresetIfEdited() {
    const preset = presetFor(state.category, state.shipping.presetId);
    if (!preset) return;
    const s = state.shipping;
    const matches =
      toNumber(s.length) === preset.lengthIn &&
      toNumber(s.width) === preset.widthIn &&
      toNumber(s.height) === preset.heightIn &&
      toNumber(s.weight) === preset.weightLb;
    if (!matches) {
      s.presetId = CUSTOM_BOX_ID;
      checkRadio('shipping.presetId', CUSTOM_BOX_ID);
    }
  }

  function handlePhoto(input: HTMLInputElement) {
    const slot = input.name.slice('photos.'.length) as PhotoSlotId;
    const file = input.files?.[0];
    if (!file) return; // picker cancelled — keep whatever was there
    touched.add(input.name);
    if (!isImageFile(file)) {
      photoErrors[slot] = `“${file.name}” isn’t a photo. Choose a JPG, PNG, or HEIC image.`;
      input.value = '';
      render();
      return;
    }
    delete photoErrors[slot];
    if (photoUrls[slot]) URL.revokeObjectURL(photoUrls[slot]!);
    state.photos[slot] = file;
    photoUrls[slot] = canPreviewImage(file) ? URL.createObjectURL(file) : undefined;
    render();
  }

  function removePhoto(slot: PhotoSlotId) {
    if (photoUrls[slot]) URL.revokeObjectURL(photoUrls[slot]!);
    delete photoUrls[slot];
    delete photoErrors[slot];
    state.photos[slot] = null;
    const input = q<HTMLInputElement>(`input[name="photos.${slot}"]`, form);
    if (input) input.value = '';
    render();
    input?.focus();
  }

  // ---- shipping estimate -----------------------------------------------------
  function scheduleEstimate() {
    const req = buildEstimateRequest(state);
    if (!req) {
      window.clearTimeout(estimateTimer);
      estimateSeq++;
      estimate = { state: 'idle' };
      return;
    }
    const key = estimateRequestKey(req);
    if (estimate.state !== 'idle' && estimate.key === key) return;
    estimate = { state: 'loading', key };
    window.clearTimeout(estimateTimer);
    const seq = ++estimateSeq;
    estimateTimer = window.setTimeout(async () => {
      const result = await getShippingEstimate(req); // never throws
      if (seq !== estimateSeq) return;
      estimate = { state: 'ready', key, estimate: result };
      render();
    }, ESTIMATE_DEBOUNCE_MS);
  }

  /**
   * The estimate to show or submit: the fetched one if it matches the current
   * box, otherwise the zone-table "roughly" number. Never blocks anything.
   */
  function currentShipping(): ShippingEstimate | null {
    const req = buildEstimateRequest(state);
    if (!req) return null;
    if (estimate.state === 'ready' && estimate.key === estimateRequestKey(req)) return estimate.estimate;
    return roughShippingEstimate(req);
  }

  // ---- navigation ------------------------------------------------------------
  function goContinue() {
    const v = validateStep(step, state);
    if (!v.valid) {
      attempted.add(step);
      render();
      focusFirstInvalid(v);
      return;
    }
    const next: StepNumber = returnToReview
      ? firstInvalidStep(state, step) ?? REVIEW_STEP
      : ((step + 1) as StepNumber);
    if (next === REVIEW_STEP) returnToReview = false;
    goTo(next);
  }

  function goTo(n: StepNumber) {
    step = n;
    if (n === SHIPPING_STEP) onEnterShipping();
    if (n === REVIEW_STEP) renderReview();
    render();
    moveFocusTo(q<HTMLElement>('[data-step-heading]', section(n)));
  }

  function onEnterShipping() {
    // Preselect the box that matches what the seat customer said they're sending.
    if (state.category === 'seat' && !state.shipping.presetId) {
      const id = SEAT_SENDING_PRESET[state.details.seat.sending];
      if (id) {
        state.shipping.presetId = id;
        checkRadio('shipping.presetId', id);
        applyPreset(id);
      }
    }
    scheduleEstimate();
  }

  function moveFocusTo(el: HTMLElement | null) {
    const nav = document.querySelector<HTMLElement>('.nav');
    const top = root.getBoundingClientRect().top + window.scrollY - (nav?.offsetHeight ?? 0) - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    el?.focus({ preventScroll: true });
  }

  function focusFirstInvalid(v: StepValidation) {
    const scope = section(step);
    for (const key of Object.keys(v.errors)) {
      if (key === 'package') {
        const dim = q<HTMLInputElement>('input[name="shipping.length"]', scope);
        if (dim) return dim.focus();
      }
      const fields = qa<HTMLInputElement>(`[name="${key}"]`, scope).filter((f) => !f.disabled && f.closest('[hidden]') === null);
      const target = fields.find((f) => f.checked) ?? fields[0];
      if (target) return target.focus();
    }
  }

  async function submit() {
    if (submitting) return;
    const bad = firstInvalidStep(state);
    if (bad !== null) {
      attempted.add(bad);
      goTo(bad);
      return;
    }
    const shipping = currentShipping();
    if (!shipping) {
      failSubmit('Something in the form is still incomplete. Check each step and try again.');
      return;
    }
    // Spam checks. Deliberately vague about why.
    const honeypot = q<HTMLInputElement>('input[name="website"]', form)?.value ?? '';
    if (honeypot) {
      failSubmit(`Your request didn’t go through. Call or text ${phone} and I’ll take it over the phone.`);
      return;
    }
    const elapsedMs = performance.now() - startedAt;
    if (elapsedMs < REQUEST_SUBMIT.minFillMs) {
      failSubmit('Take a moment to look over your answers, then press Send my request again.');
      return;
    }

    // Set before the first await so a double click or a second Enter can't send twice.
    submitting = true;
    submitError = '';
    submitErrorStep = null;
    render();

    let payload: IntakePayload;
    let photos: Record<PhotoSlotId, File>;
    try {
      // Resize and re-encode photos before they go anywhere. Silent: the button
      // already reads "Sending…", and compression never throws.
      photos = await compressPhotos(state.photos as Record<PhotoSlotId, File>);
      payload = buildPayload({ ...state, photos }, shipping, sendWeeks);
    } catch {
      failSubmit('Something in the form is still incomplete. Check each step and try again.');
      return;
    }

    try {
      const body = buildRepairRequestPayload(payload, { ...state, photos }, {
        clientSubmissionId,
        formElapsedMs: elapsedMs,
        honeypot,
      });
      const result = await submitRepairRequest(supabaseTarget, body, photos);
      showDone(result, payload);
    } catch (err) {
      const failure: SubmitFailure = err instanceof SubmitError ? err.failure : { kind: 'unavailable' };
      // Every answer stays in state; nothing is reset.
      failSubmit(submitFailureMessage(failure), failure.kind === 'rejected' ? failure.step : null);
    }
  }

  function failSubmit(message: string, backToStep: StepNumber | null = null) {
    submitting = false;
    submitError = message;
    submitErrorStep = backToStep;
    render();
    const focusTarget = backToStep !== null ? out('submit-error-step') : q<HTMLElement>('[data-primary]', form);
    focusTarget?.focus();
  }

  function submitFailureMessage(failure: SubmitFailure): string {
    switch (failure.kind) {
      case 'network':
        return `I couldn’t reach the server, so your request hasn’t gone through yet. Your answers are all still here. Check your connection and press Send my request again, or call or text ${phone}.`;
      case 'rejected':
        return failure.step !== null
          ? `${failure.message} That’s on step ${failure.step} (${STEP_TITLES[failure.step - 1]}). Your other answers are still here.`
          : `${failure.message} If it keeps happening, call or text ${phone}.`;
      case 'spam':
        return `Your request didn’t go through. Call or text ${phone} and I’ll take it over the phone.`;
      case 'unavailable':
        return `Your request didn’t go through on my end. Nothing was sent or charged, and your answers are still here. Try again in a minute, or call or text ${phone}.`;
    }
  }

  function showDone(result: SubmitResult, payload: IntakePayload) {
    for (const url of Object.values(photoUrls)) if (url) URL.revokeObjectURL(url);
    const firstName = payload.contact.name.split(/\s+/)[0];
    setText('done-heading', `Thanks, ${firstName}. I’ve got your request.`);
    setText('done-reference', result.requestNumber);
    setText('done-reference-spoken', spokenRequestNumber(result.requestNumber));
    const photoNote = out('done-photos');
    if (photoNote) {
      const n = result.photoFailures.length;
      photoNote.hidden = n === 0;
      setText(
        'done-photos-text',
        n === 0
          ? ''
          : n === PHOTO_SLOTS.length
            ? 'Your photos didn’t upload, but your request is saved. I may ask you to send them again when I reach out.'
            : `${n === 1 ? 'One of your photos' : 'Some of your photos'} didn’t upload (${result.photoFailures
                .map((s) => PHOTO_SLOTS.find((p) => p.id === s)?.label.toLowerCase() ?? s)
                .join(', ')}), but your request is saved. I may ask you to send ${n === 1 ? 'it' : 'them'} again when I reach out.`,
      );
    }
    setText(
      'done-contact',
      payload.contact.method === 'phone'
        ? `I’ll call you at ${payload.contact.phone} within one business day.`
        : `I’ll email you at ${payload.contact.email} within one business day to set up a quick call.`,
    );
    form.hidden = true;
    root.classList.add('is-done');
    done.hidden = false;
    moveFocusTo(q<HTMLElement>('[data-done-heading]', done));
  }

  // ---- rendering -------------------------------------------------------------
  function render() {
    const v = validateStep(step, state);

    for (const s of qa('section[data-step]', form)) s.hidden = Number(s.dataset.step) !== step;
    for (const b of qa('[data-branch]', form)) b.hidden = b.dataset.branch !== state.category;

    qa('[data-progress-step]').forEach((seg) => {
      const n = Number(seg.dataset.progressStep);
      seg.classList.toggle('is-done', n < step);
      seg.classList.toggle('is-current', n === step);
    });

    if (step === 3) renderRepairEstimate();
    if (step === 4) renderPhotos();
    if (step === SHIPPING_STEP) renderShipping();
    renderErrors(v);
    renderActions(v);
  }

  function renderErrors(v: StepValidation) {
    const scope = section(step);
    for (const el of qa('[data-error-for]', scope)) {
      const key = el.dataset.errorFor!;
      const slot = key.startsWith('photos.') ? (key.slice('photos.'.length) as PhotoSlotId) : null;
      const photoError = slot ? photoErrors[slot] : undefined;
      const message: string | undefined = photoError ?? v.errors[key];
      const show = !!message && (!!photoError || touched.has(key) || attempted.has(step));
      el.textContent = show && message ? message : '';
      el.hidden = !show;
      for (const field of qa(`[name="${key}"]`, scope)) {
        if (show) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
      }
    }
  }

  function renderActions(v: StepValidation) {
    const back = q<HTMLButtonElement>('[data-action="back"]', form);
    const primary = q<HTMLButtonElement>('[data-primary]', form);
    if (back) {
      back.hidden = step === 1;
      back.disabled = submitting;
    }
    if (primary) {
      const blocked = !v.valid || submitting;
      primary.setAttribute('aria-disabled', String(blocked));
      primary.disabled = submitting;
      primary.toggleAttribute('aria-busy', submitting);
      primary.textContent = step < REVIEW_STEP ? 'Continue' : submitting ? 'Sending…' : 'Send my request';
    }

    setText('hint', v.valid ? (step === REVIEW_STEP ? 'Everything’s filled in.' : '') : v.firstError ?? '');

    const footerEstimate = out('footer-estimate');
    if (footerEstimate) {
      footerEstimate.hidden = step < 3;
      footerEstimate.textContent = footerEstimateText();
    }

    const err = out('submit-error');
    if (err) {
      err.hidden = !submitError;
      setText('submit-error-text', submitError);
      const goStep = out('submit-error-step');
      if (goStep) {
        goStep.hidden = submitErrorStep === null;
        goStep.textContent = submitErrorStep === null ? '' : `Go to step ${submitErrorStep}`;
      }
    }
    for (const edit of qa<HTMLButtonElement>('[data-action="edit"]', form)) edit.disabled = submitting;
  }

  function footerEstimateText(): string {
    const est = estimateRepair(state);
    const shipping = step >= SHIPPING_STEP ? currentShipping() : null;
    if (shipping) {
      const total = combinedEstimateRange(est.low, est.high, shipping);
      const range = formatUsdRange(total.low, total.high);
      return `Estimate with shipping: ${shipping.source === 'roughly' ? `roughly ${range}` : range}`;
    }
    if (est.caseByCase) return `Repair: ${formatUsd(MINIMUM_USD)} minimum, quoted case by case`;
    return `Repair estimate: ${formatUsdRange(est.low, est.high)}`;
  }

  function renderRepairEstimate() {
    const est = estimateRepair(state);
    setText('repair-estimate', est.caseByCase ? `${formatUsd(MINIMUM_USD)} minimum` : formatUsdRange(est.low, est.high));
    const notes: string[] = [];
    if (est.caseByCase) {
      notes.push('Other canvas is quoted case by case once I see it.');
    } else {
      if (est.items.length === 0) notes.push('Check the repairs that apply and the range updates.');
      if (est.quantity > 1) notes.push(`Covers ${est.quantity} seats with the same repairs.`);
      if (est.minimumApplied) notes.push(`Includes the ${formatUsd(MINIMUM_USD)} minimum.`);
      if (est.hasNotes) notes.push('Anything you described in your own words gets priced once I see it.');
    }
    setText('repair-estimate-notes', notes.join(' '));
  }

  function renderPhotos() {
    for (const slot of PHOTO_SLOTS) {
      const wrap = q(`[data-photo-slot="${slot.id}"]`, form);
      if (!wrap) continue;
      const file = state.photos[slot.id];
      const url = photoUrls[slot.id];
      const img = q<HTMLImageElement>('[data-photo-img]', wrap);
      const preview = q('[data-photo-preview]', wrap);
      const empty = q('[data-photo-empty]', wrap);
      const name = q('[data-photo-name]', wrap);
      const remove = q('[data-action="remove-photo"]', wrap);
      const action = q('[data-photo-action]', wrap);

      wrap.classList.toggle('has-file', !!file);
      if (preview && img) {
        preview.hidden = !url;
        if (url && img.src !== url) {
          img.src = url;
          img.alt = `Preview: ${slot.label}`;
        }
      }
      if (empty) empty.hidden = !!url;
      if (name) {
        name.hidden = !file;
        name.textContent = file
          ? url
            ? file.name
            : `${file.name} is attached. This browser can’t preview HEIC photos, but it will still upload.`
          : '';
      }
      if (remove) remove.hidden = !file;
      if (action) action.textContent = file ? 'Replace photo' : 'Choose a photo';
    }
  }

  function renderShipping() {
    renderPackage();
    renderEstimatePanel();
  }

  function renderPackage() {
    const pkg = assessPackage(state.shipping);
    const panel = out('package');
    const block = out('package-block');
    if (!panel || !block) return;

    panel.hidden = !pkg.complete || pkg.blocked;
    block.hidden = !pkg.blocked;
    if (!pkg.complete) return;

    const [l, w, hgt] = pkg.dimsIn;
    if (!pkg.blocked) {
      setText('package-measured', `${l} × ${w} × ${hgt} in, ${pkg.actualWeightLb} lb. Length plus girth is ${pkg.lengthPlusGirthIn} in.`);
      setText('package-billable', `Billed at ${pkg.billableWeightLb} lb.`);
      const dim = out('package-dim');
      if (dim) {
        dim.hidden = !pkg.dimensionalApplies;
        dim.textContent = pkg.dimensionalApplies
          ? `The carrier bills this box at ${pkg.dimensionalWeightLb} lb, not the ${pkg.actualWeightLb} lb it weighs, because it charges for the space a box takes up. Packing it tighter into a smaller box lowers your shipping cost.`
          : '';
      }
      return;
    }

    const reasons: string[] = [];
    if (pkg.overWeight) {
      reasons.push(`It weighs ${pkg.actualWeightLb} lb. Carriers won’t take a single parcel over ${CARRIER_LIMITS.maxParcelWeightLb} lb.`);
    }
    if (pkg.overLengthPlusGirth) {
      reasons.push(`Length plus girth is ${pkg.lengthPlusGirthIn} in. The limit is ${CARRIER_LIMITS.maxLengthPlusGirthIn} in.`);
    }
    if (pkg.overVolume) {
      reasons.push(`The box is ${pkg.volumeCubicIn.toLocaleString('en-US')} cubic inches. The limit is ${CARRIER_LIMITS.maxVolumeCubicIn.toLocaleString('en-US')}.`);
    }
    out('package-reasons')?.replaceChildren(...reasons.map((r) => h('li', {}, r)));

    const sizeProblem = pkg.overLengthPlusGirth || pkg.overVolume;
    setText(
      'package-block-title',
      sizeProblem ? 'This box is too big to ship as a normal parcel.' : 'This box is too heavy to ship as one parcel.',
    );
    setText(
      'package-block-why',
      sizeProblem
        ? `Over that line the carrier bills it as at least ${CARRIER_LIMITS.oversizeMinimumBillableLb} lb no matter what it weighs, plus an oversize fee. You can’t continue until the box fits.`
        : 'Split it into two boxes and enter the heavier one. You can’t continue until it’s under the limit.',
    );
    const fixes = out('package-fixes');
    if (fixes) fixes.hidden = !sizeProblem;
  }

  function renderEstimatePanel() {
    const req = buildEstimateRequest(state);
    const key = req ? estimateRequestKey(req) : null;
    const status: 'idle' | 'loading' | 'ready' =
      !key || estimate.state === 'idle' ? (key ? 'loading' : 'idle') : estimate.key !== key ? 'loading' : estimate.state;

    for (const el of qa('[data-estimate-state]', form)) el.hidden = el.dataset.estimateState !== status;

    if (status === 'idle') {
      setText(
        'estimate-idle',
        assessPackage(state.shipping).blocked
          ? 'Fix the box above to see a shipping estimate.'
          : 'Enter your ZIP, pick home or business, and add your box size to see a round-trip shipping estimate.',
      );
    }
    if (status === 'ready' && estimate.state === 'ready') {
      const est = estimate.estimate;
      setText('estimate-range', formatShippingEstimate(est));
      setText(
        'estimate-source',
        est.source === 'live'
          ? 'Based on current ground rates for your ZIP, both directions.'
          : 'Roughly, based on distance from the shop. Live carrier rates weren’t available just now.',
      );
    }
  }

  function renderSendWeeks() {
    const list = out('send-weeks');
    if (!list) return;
    list.replaceChildren(
      ...sendWeeks.map((wk) => {
        const input = h('input', {
          type: 'radio',
          name: 'shipping.sendWeekId',
          value: wk.id,
          class: 'tile-input',
          'aria-describedby': 'err-shipping-sendWeekId',
        });
        input.required = true;
        return h('label', { class: 'tile tile-compact' }, input, h('span', { class: 'tile-body' }, h('span', { class: 'tile-title' }, wk.label)));
      }),
    );
  }

  function renderReview() {
    const container = out('review');
    if (!container) return;
    const cat = state.category;
    if (!cat) return;
    const est = estimateRepair(state);
    const pkg = assessPackage(state.shipping);
    const shipping = currentShipping();
    const orNone = (v: string) => (v.trim() ? v.trim() : 'Not given');

    const detailRows: [string, string][] = (() => {
      const d = state.details;
      switch (cat) {
        case 'tent':
          return [['Type', optionLabel(TENT_TYPES, d.tent.type)], ['Size', d.tent.size.trim()], ['Age', optionLabel(TENT_AGES, d.tent.age)], ['Brand', orNone(d.tent.brand)]];
        case 'shade':
          return [['Type', optionLabel(SHADE_TYPES, d.shade.type)], ['Dimensions', d.shade.dimensions.trim()], ['Brand', orNone(d.shade.brand)]];
        case 'seat':
          return [['Type', optionLabel(SEAT_TYPES, d.seat.type)], ['Make, model, year', d.seat.makeModelYear.trim()], ['Sending', optionLabel(SEAT_SENDING, d.seat.sending)], ['How many', String(est.quantity)]];
        case 'other':
          return [['Item', d.other.description.trim()], ['Size', d.other.size.trim()]];
      }
    })();

    const damageRows: [string, string][] = est.caseByCase
      ? [['Pricing', 'Quoted case by case']]
      : est.items.map((b) => [b.label, formatUsdRange(b.low, b.high)] as [string, string]);
    const notes = state.damageNotes[cat].trim();
    if (notes) damageRows.push(['In your words', notes]);

    const ceiling = toNumber(state.terms.spendCeiling);
    const termsRows: [string, string][] = [
      ['Clean and dry', 'Confirmed'],
      ['Call before starting if the quote is over', ceiling !== null ? formatUsd(ceiling) : 'No limit set'],
      ['If it can’t be repaired', optionLabel(UNREPAIRABLE_CHOICES, state.terms.ifUnrepairable)],
      ['Rough replacement cost', formatUsd(toNumber(state.terms.replacementValue) ?? 0)],
    ];

    const week = sendWeeks.find((w) => w.id === state.shipping.sendWeekId);
    const shippingRows: [string, string][] = [
      ['Ships from', `${state.shipping.zip.trim()} (${state.shipping.addressType})`],
      ['Box', `${pkg.dimsIn[0]} × ${pkg.dimsIn[1]} × ${pkg.dimsIn[2]} in`],
      ['Weight', pkg.dimensionalApplies ? `${pkg.actualWeightLb} lb, billed at ${pkg.billableWeightLb} lb` : `${pkg.billableWeightLb} lb`],
      ['Hoping to send', week ? week.label : 'Not chosen'],
    ];

    const { contact } = state;
    const phoneDigits = normalizePhone(contact.phone);
    const contactRows: [string, string][] = [
      ['Name', contact.name.trim()],
      ['Phone', phoneDigits ? formatPhone(phoneDigits) : contact.phone.trim()],
      ['Email', contact.email.trim()],
      ['Best way to reach you', optionLabel(CONTACT_METHODS, contact.method)],
      ['Best time', optionLabel(BEST_TIMES, contact.bestTime)],
    ];
    if (contact.foundVia) {
      const detail = contact.foundViaDetail.trim();
      contactRows.push(['Found me through', detail ? `${optionLabel(FOUND_VIA, contact.foundVia)}: ${detail}` : optionLabel(FOUND_VIA, contact.foundVia)]);
    }

    const photoFigures = PHOTO_SLOTS.map((slot) => {
      const file = state.photos[slot.id];
      const url = photoUrls[slot.id];
      return h(
        'figure',
        { class: 'review-photo' },
        url ? h('img', { src: url, alt: `Preview: ${slot.label}` }) : h('div', { class: 'review-photo-empty' }, file ? file.name : 'Missing'),
        h('figcaption', {}, slot.label),
      );
    });

    const sectionEl = (title: string, editStep: StepNumber, rows: [string, string][], extra?: Node) =>
      h(
        'section',
        { class: 'review-block' },
        h(
          'div',
          { class: 'review-head' },
          h('h3', {}, title),
          h('button', { type: 'button', class: 'link-button', 'data-action': 'edit', 'data-edit-step': String(editStep) }, 'Edit', h('span', { class: 'visually-hidden' }, ` ${title.toLowerCase()}`)),
        ),
        rows.length ? h('dl', { class: 'review-list' }, ...rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])) : null,
        extra,
      );

    const total = shipping ? combinedEstimateRange(est.low, est.high, shipping) : { low: est.low, high: est.high };
    const estimateRows: [string, string][] = [
      ['Repair', est.caseByCase ? `${formatUsd(MINIMUM_USD)} minimum, quoted case by case` : formatUsdRange(est.low, est.high)],
    ];
    if (shipping) estimateRows.push(['Shipping, round trip', formatShippingEstimate(shipping)]);

    const estimateNotes: string[] = [
      'This is an estimate, not a quote. On the call I confirm the repair and the real shipping cost, and the firm price comes with photos after I see it.',
    ];
    if (ceiling !== null && total.high > ceiling) {
      estimateNotes.push(`The high end is over your ${formatUsd(ceiling)} limit. We’ll talk about that on the call, before you ship anything.`);
    }

    const totalText = formatUsdRange(total.low, total.high);
    container.replaceChildren(
      sectionEl('How to reach you', 7, contactRows),
      sectionEl('What you’re sending', 1, [['Category', optionLabel(CATEGORIES, cat)]]),
      sectionEl('Item details', 2, detailRows),
      sectionEl('Damage', 3, damageRows),
      sectionEl('Photos', 4, [], h('div', { class: 'review-photos' }, ...photoFigures)),
      sectionEl('Terms', 5, termsRows),
      sectionEl('Shipping and timing', SHIPPING_STEP, shippingRows),
      h(
        'section',
        { class: 'review-estimate' },
        h('h3', {}, 'Combined estimate'),
        h('dl', { class: 'review-list' }, ...estimateRows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        h(
          'p',
          { class: 'review-total' },
          h('span', {}, 'Total estimate'),
          h('strong', {}, shipping?.source === 'roughly' ? `Roughly ${totalText}` : totalText),
        ),
        h('p', { class: 'review-estimate-note' }, estimateNotes.join(' ')),
      ),
    );
  }

  function newUuid(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Non-secure contexts (plain-http previews) lack randomUUID.
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // ---- boot ----------------------------------------------------------------
  form.addEventListener('input', onFieldEvent);
  form.addEventListener('change', onFieldEvent);
  form.addEventListener('focusout', onFocusOut);
  form.addEventListener('submit', onSubmit);
  root.addEventListener('click', onClick);

  renderSendWeeks();
  root.classList.add('is-ready');
  render();
}

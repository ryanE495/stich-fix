/**
 * Browser controller for the mail-in intake form.
 *
 * Owns form state (in memory only — it resets on refresh by design), wires
 * DOM events to state, and re-renders from state. Every business rule is a
 * call into rules.ts; network-shaped work goes through the three swap points:
 *   - rates.ts         getShippingRates()  → EasyPost/Shippo via the server
 *   - intake-weeks.ts  getIntakeWeeks()    → booked counts from the backend
 *   - submit.ts        submitIntake()      → the real submit handler
 */

import {
  CARRIER_LIMITS,
  CATEGORIES,
  CUSTOM_BOX_ID,
  MINIMUM_USD,
  PHOTO_SLOTS,
  SEAT_SENDING,
  SEAT_SENDING_PRESET,
  SEAT_TYPES,
  SHADE_TYPES,
  STEP_COUNT,
  TENT_AGES,
  TENT_TYPES,
  UNREPAIRABLE_CHOICES,
  optionLabel,
} from '../../config/mail-in-intake';
import { getIntakeWeeks } from './intake-weeks';
import { getShippingRates } from './rates';
import {
  assessPackage,
  buildPayload,
  buildRateRequest,
  canPreviewImage,
  combinedEstimateRange,
  createInitialState,
  estimateRepair,
  firstInvalidStep,
  formatUsd,
  formatUsdRange,
  isCategory,
  isImageFile,
  presetFor,
  rateRequestKey,
  toNumber,
  validateStep,
} from './rules';
import { submitIntake } from './submit';
import type {
  IntakePayload,
  PhotoSlotId,
  RateStatus,
  RuleContext,
  StepNumber,
  StepValidation,
  SubmitResult,
  WeeksStatus,
} from './types';

const RATE_DEBOUNCE_MS = 350;
const DIM_FIELDS = ['shipping.length', 'shipping.width', 'shipping.height', 'shipping.weight'];
/** Keys with their own status panels instead of an inline field error. */
const PANEL_KEYS = new Set(['package', 'rates']);

export function initIntakeForm(root: HTMLElement): void {
  const formEl = root.querySelector<HTMLFormElement>('[data-intake-form]');
  const doneEl = root.querySelector<HTMLElement>('[data-intake-done]');
  if (!formEl || !doneEl) return;
  // Re-bound as non-null so nested functions keep the narrowed type.
  const form: HTMLFormElement = formEl;
  const done: HTMLElement = doneEl;

  const phone = root.dataset.phone ?? '';

  // ---- state ---------------------------------------------------------------
  const state = createInitialState();
  let step: StepNumber = 1;
  let rates: RateStatus = { state: 'idle' };
  let weeks: WeeksStatus = { state: 'loading' };
  let renderedWeeks: WeeksStatus | null = null;
  const touched = new Set<string>();
  const attempted = new Set<StepNumber>();
  const photoErrors: Partial<Record<PhotoSlotId, string>> = {};
  const photoUrls: Partial<Record<PhotoSlotId, string>> = {};
  let returnToReview = false;
  let submitting = false;
  let submitError = '';
  let rateTimer: number | undefined;
  let rateSeq = 0;

  const ctx = (): RuleContext => ({ rates, weeks });
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

    scheduleRates();
    render();
  }

  function onFocusOut(e: FocusEvent) {
    const el = e.target;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      if (el.name && el.type !== 'file' && !touched.has(el.name)) {
        touched.add(el.name);
        render();
      }
    }
  }

  function onClick(e: MouseEvent) {
    const target = (e.target as Element).closest<HTMLElement>('[data-action]');
    if (!target || !root.contains(target)) return;
    switch (target.dataset.action) {
      case 'back':
        if (step > 1) goTo((step - 1) as StepNumber);
        break;
      case 'edit': {
        const n = Number(target.dataset.editStep);
        if (n >= 1 && n <= 6) {
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
      case 'retry-rates':
        rates = { state: 'idle' };
        scheduleRates();
        render();
        break;
      case 'retry-weeks':
        void loadWeeks();
        break;
    }
  }

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (step < STEP_COUNT) goContinue();
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

  // ---- async data ------------------------------------------------------------
  function scheduleRates() {
    const req = buildRateRequest(state);
    if (!req) {
      window.clearTimeout(rateTimer);
      rateSeq++;
      rates = { state: 'idle' };
      return;
    }
    const key = rateRequestKey(req);
    if ((rates.state === 'ready' || rates.state === 'loading') && rates.key === key) return;
    rates = { state: 'loading', key };
    window.clearTimeout(rateTimer);
    const seq = ++rateSeq;
    rateTimer = window.setTimeout(async () => {
      try {
        const quote = await getShippingRates(req);
        if (seq !== rateSeq) return;
        rates = { state: 'ready', key, quote };
      } catch {
        if (seq !== rateSeq) return;
        rates = { state: 'error', key };
      }
      render();
    }, RATE_DEBOUNCE_MS);
  }

  async function loadWeeks() {
    weeks = { state: 'loading' };
    render();
    try {
      weeks = { state: 'ready', weeks: await getIntakeWeeks() };
    } catch {
      weeks = { state: 'error' };
    }
    render();
  }

  // ---- navigation ------------------------------------------------------------
  function goContinue() {
    const v = validateStep(step, state, ctx());
    if (!v.valid) {
      attempted.add(step);
      render();
      focusFirstInvalid(v);
      return;
    }
    const next: StepNumber = returnToReview
      ? firstInvalidStep(state, ctx(), step) ?? 7
      : ((step + 1) as StepNumber);
    if (next === 7) returnToReview = false;
    goTo(next);
  }

  function goTo(n: StepNumber) {
    step = n;
    if (n === 6) onEnterShipping();
    if (n === 7) renderReview();
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
    scheduleRates();
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
      if (PANEL_KEYS.has(key)) continue;
      const fields = qa<HTMLInputElement>(`[name="${key}"]`, scope).filter((f) => !f.disabled && f.closest('[hidden]') === null);
      const target = fields.find((f) => f.checked) ?? fields[0];
      if (target) return target.focus();
    }
  }

  async function submit() {
    if (submitting) return;
    const bad = firstInvalidStep(state, ctx());
    if (bad !== null) {
      attempted.add(bad);
      goTo(bad);
      return;
    }
    let payload: IntakePayload;
    try {
      payload = buildPayload(state, ctx());
    } catch {
      submitError = 'Something in the form is still incomplete. Check each step and try again.';
      render();
      return;
    }
    submitting = true;
    submitError = '';
    render();
    try {
      const result = await submitIntake(payload);
      showDone(result, payload);
    } catch {
      submitError = `Your request didn’t go through, and nothing was charged. Try again, or call or text ${phone}.`;
      submitting = false;
      render();
    }
  }

  function showDone(result: SubmitResult, payload: IntakePayload) {
    for (const url of Object.values(photoUrls)) if (url) URL.revokeObjectURL(url);
    setText('done-reference', result.reference);
    setText('done-week', payload.intakeWeek.label);
    form.hidden = true;
    root.classList.add('is-done');
    done.hidden = false;
    moveFocusTo(q<HTMLElement>('[data-done-heading]', done));
  }

  // ---- rendering -------------------------------------------------------------
  function render() {
    const v = validateStep(step, state, ctx());

    for (const s of qa('section[data-step]', form)) s.hidden = Number(s.dataset.step) !== step;
    for (const b of qa('[data-branch]', form)) b.hidden = b.dataset.branch !== state.category;

    qa('[data-progress-step]').forEach((seg) => {
      const n = Number(seg.dataset.progressStep);
      seg.classList.toggle('is-done', n < step);
      seg.classList.toggle('is-current', n === step);
    });

    if (step === 3) renderRepairEstimate();
    if (step === 4) renderPhotos();
    if (step === 6) renderShipping();
    renderErrors(v);
    renderActions(v);
  }

  function renderErrors(v: StepValidation) {
    const scope = section(step);
    for (const el of qa('[data-error-for]', scope)) {
      const key = el.dataset.errorFor!;
      const slot = key.startsWith('photos.') ? (key.slice('photos.'.length) as PhotoSlotId) : null;
      const photoError = slot ? photoErrors[slot] : undefined;
      let message: string | undefined = photoError ?? v.errors[key];
      // Week list shows its own loading/error panel until weeks are loaded.
      if (key === 'shipping.intakeWeekId' && weeks.state !== 'ready') message = undefined;
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
    if (back) back.hidden = step === 1;
    if (primary) {
      const blocked = !v.valid || submitting;
      primary.setAttribute('aria-disabled', String(blocked));
      primary.toggleAttribute('aria-busy', submitting);
      primary.textContent = step < STEP_COUNT ? 'Continue' : submitting ? 'Submitting…' : 'Submit repair request';
    }

    setText('hint', v.valid ? (step === STEP_COUNT ? 'Everything’s filled in.' : '') : v.firstError ?? '');

    const footerEstimate = out('footer-estimate');
    if (footerEstimate) {
      footerEstimate.hidden = step < 3;
      footerEstimate.textContent = footerEstimateText();
    }

    const err = out('submit-error');
    if (err) {
      err.hidden = !submitError;
      err.textContent = submitError;
    }
  }

  function currentQuote() {
    const req = buildRateRequest(state);
    return req && rates.state === 'ready' && rates.key === rateRequestKey(req) ? rates.quote : null;
  }

  function footerEstimateText(): string {
    const est = estimateRepair(state);
    const quote = step >= 6 ? currentQuote() : null;
    if (quote) {
      const total = combinedEstimateRange(est.low, est.high, quote.roundTripUsd);
      return `Estimate with shipping: ${formatUsdRange(total.low, total.high)}`;
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
    renderRates();
    renderWeeks();
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
    const list = out('package-reasons');
    list?.replaceChildren(...reasons.map((r) => h('li', {}, r)));

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

  function renderRates() {
    const req = buildRateRequest(state);
    const key = req ? rateRequestKey(req) : null;
    const status: 'idle' | 'loading' | 'ready' | 'error' =
      !key || rates.state === 'idle' || !('key' in rates) || rates.key !== key ? (key ? 'loading' : 'idle') : rates.state;

    for (const el of qa('[data-rates-state]', form)) el.hidden = el.dataset.ratesState !== status;

    if (status === 'idle') {
      const pkg = assessPackage(state.shipping);
      setText(
        'rates-idle',
        toNumber(state.terms.declaredValue) === null
          ? 'Go back to step 5 and enter a declared value. Shipping insurance depends on it.'
          : pkg.blocked
            ? 'Fix the box above to see shipping.'
            : 'Enter your ZIP, address type, and box size to see shipping both ways.',
      );
    }
    if (status === 'ready' && rates.state === 'ready') {
      const { toShop, toCustomer, roundTripUsd, note } = rates.quote;
      setText('rate-to-shop', formatUsd(toShop.amountUsd));
      setText('rate-to-customer', formatUsd(toCustomer.amountUsd));
      setText('rate-round-trip', formatUsd(roundTripUsd));
      const insurance = toShop.insuranceUsd + toCustomer.insuranceUsd;
      setText(
        'rate-note',
        insurance > 0 ? `${note} Includes ${formatUsd(insurance)} for declared-value coverage, both ways.` : note,
      );
    }
  }

  function renderWeeks() {
    for (const el of qa('[data-weeks-state]', form)) el.hidden = el.dataset.weeksState !== weeks.state;
    if (renderedWeeks === weeks) return;
    renderedWeeks = weeks;
    const list = out('weeks-list');
    if (!list || weeks.state !== 'ready') return;

    list.replaceChildren(
      ...weeks.weeks.map((wk) => {
        const full = wk.remaining <= 0;
        const input = h('input', { type: 'radio', name: 'shipping.intakeWeekId', value: wk.id, class: 'tile-input', 'aria-describedby': 'err-shipping-intakeWeekId' });
        input.required = true;
        input.disabled = full;
        input.checked = state.shipping.intakeWeekId === wk.id;
        const meta = full ? 'Full' : `${wk.remaining} of ${wk.capacity} spots open`;
        return h(
          'label',
          { class: `tile tile-week${full ? ' is-full' : ''}` },
          input,
          h('span', { class: 'tile-body' }, h('span', { class: 'tile-title' }, `Week of ${wk.label}`), h('span', { class: 'tile-hint' }, meta)),
        );
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
    const quote = currentQuote();
    const week = weeks.state === 'ready' ? weeks.weeks.find((w) => w.id === state.shipping.intakeWeekId) : undefined;
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
      ['Declared value', formatUsd(toNumber(state.terms.declaredValue) ?? 0)],
    ];

    const shippingRows: [string, string][] = [
      ['Ships from', `${state.shipping.zip.trim()} (${state.shipping.addressType})`],
      ['Box', `${pkg.dimsIn[0]} × ${pkg.dimsIn[1]} × ${pkg.dimsIn[2]} in`],
      ['Weight', pkg.dimensionalApplies ? `${pkg.actualWeightLb} lb, billed at ${pkg.billableWeightLb} lb` : `${pkg.billableWeightLb} lb`],
      ['Intake week', week ? `Week of ${week.label}` : 'Not chosen'],
    ];

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

    const categoryLabel = optionLabel(CATEGORIES, cat);
    const { low: totalLow, high: totalHigh } = quote
      ? combinedEstimateRange(est.low, est.high, quote.roundTripUsd)
      : { low: est.low, high: est.high };

    const estimateRows: [string, string][] = [
      ['Repair', est.caseByCase ? `${formatUsd(MINIMUM_USD)} minimum, quoted case by case` : formatUsdRange(est.low, est.high)],
    ];
    if (quote) {
      estimateRows.push(['Shipping to the shop', formatUsd(quote.toShop.amountUsd)]);
      estimateRows.push(['Shipping back to you', formatUsd(quote.toCustomer.amountUsd)]);
    }

    const estimateNotes: string[] = ['This is an estimate, not a quote. The firm price comes with photos after I see it.'];
    if (quote) estimateNotes.push(quote.note);
    if (ceiling !== null && totalHigh > ceiling) {
      estimateNotes.push(`The high end is over your ${formatUsd(ceiling)} limit. If the firm quote is over it, I’ll call before starting.`);
    }

    container.replaceChildren(
      sectionEl('What you’re sending', 1, [['Category', categoryLabel]]),
      sectionEl('Item details', 2, detailRows),
      sectionEl('Damage', 3, damageRows),
      sectionEl('Photos', 4, [], h('div', { class: 'review-photos' }, ...photoFigures)),
      sectionEl('Terms', 5, termsRows),
      sectionEl('Shipping and intake week', 6, shippingRows),
      h(
        'section',
        { class: 'review-estimate' },
        h('h3', {}, 'Combined estimate'),
        h('dl', { class: 'review-list' }, ...estimateRows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
        h('p', { class: 'review-total' }, h('span', {}, 'Total estimate'), h('strong', {}, formatUsdRange(totalLow, totalHigh))),
        h('p', { class: 'review-estimate-note' }, estimateNotes.join(' ')),
      ),
    );
  }

  // ---- boot ----------------------------------------------------------------
  form.addEventListener('input', onFieldEvent);
  form.addEventListener('change', onFieldEvent);
  form.addEventListener('focusout', onFocusOut);
  form.addEventListener('submit', onSubmit);
  root.addEventListener('click', onClick);

  root.classList.add('is-ready');
  render();
  void loadWeeks();
}

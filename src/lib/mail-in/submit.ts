import type { IntakePayload, SubmitResult } from './types';

/**
 * TODO(backend): Replace with the real submit handler — send the payload to
 * the intake endpoint (multipart, so the three photo Files upload), create
 * the job, issue the prepaid label and job tag, and return the job reference
 * the backend assigns. Throw on failure; the form shows an error and lets the
 * customer try again. Keep this signature.
 */
export async function submitIntake(payload: IntakePayload): Promise<SubmitResult> {
  console.log('[mail-in intake] payload', payload);
  return { reference: placeholderReference() };
}

/** Placeholder job reference. The backend will assign the real one. */
function placeholderReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = '';
  for (let i = 0; i < 5; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return `WSS-${ref}`;
}

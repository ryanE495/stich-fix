import { FLEXIBLE_WEEK_ID, SEND_WEEKS_SHOWN } from '../../config/mail-in-intake';
import type { SendWeekOption } from './types';

/**
 * "When are you hoping to send it?" options: the next few weeks plus
 * "I'm flexible". A preference only — timing is confirmed on the call, so
 * there's no capacity, no booking, and nothing to read from a backend.
 *
 * Runs in the browser so the dates are relative to the visitor's today, not
 * frozen at build time. Weeks start on the Monday after today.
 */
export function getSendWeekOptions(today: Date = new Date()): SendWeekOption[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysToNextMonday = (8 - start.getDay()) % 7 || 7;
  start.setDate(start.getDate() + daysToNextMonday);

  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const weeks: SendWeekOption[] = [];
  for (let i = 0; i < SEND_WEEKS_SHOWN; i++) {
    const monday = new Date(start);
    monday.setDate(start.getDate() + i * 7);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    weeks.push({ id: isoDate(monday), label: `Week of ${fmt.format(monday)} – ${fmt.format(friday)}` });
  }
  weeks.push({ id: FLEXIBLE_WEEK_ID, label: 'I’m flexible' });
  return weeks;
}

function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

import { INTAKE_CAPACITY_PER_WEEK, INTAKE_WEEKS_SHOWN } from '../../config/mail-in-intake';
import type { IntakeWeek } from './types';

/**
 * TODO(backend): Read booked job counts per intake week from the backend and
 * compute `remaining` from real bookings. Keep this signature. The week dates
 * below are real (computed from the visitor's today); only the remaining
 * counts are hardcoded.
 */
const PLACEHOLDER_REMAINING = [0, 1, 3, 4, 5];

/**
 * The next INTAKE_WEEKS_SHOWN weeks, Monday through Friday, starting with the
 * Monday after today (a box shipped today can't arrive this week).
 * Runs in the browser so dates are never frozen at build time.
 */
export async function getIntakeWeeks(today: Date = new Date()): Promise<IntakeWeek[]> {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysToNextMonday = (8 - start.getDay()) % 7 || 7;
  start.setDate(start.getDate() + daysToNextMonday);

  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const weeks: IntakeWeek[] = [];
  for (let i = 0; i < INTAKE_WEEKS_SHOWN; i++) {
    const monday = new Date(start);
    monday.setDate(start.getDate() + i * 7);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    weeks.push({
      id: isoDate(monday),
      label: `${fmt.format(monday)} – ${fmt.format(friday)}`,
      capacity: INTAKE_CAPACITY_PER_WEEK,
      remaining: Math.min(PLACEHOLDER_REMAINING[i] ?? INTAKE_CAPACITY_PER_WEEK, INTAKE_CAPACITY_PER_WEEK),
    });
  }
  return weeks;
}

function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

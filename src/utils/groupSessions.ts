import { format, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Session } from '../types';

export interface GroupedSessions {
  key: string;
  label: string;
  sessions: Session[];
}

export function groupSessionsByMonth(sessions: Session[]): GroupedSessions[] {
  const groups = new Map<string, GroupedSessions>();

  for (const s of sessions) {
    const date = s.end_time || s.start_time;
    const d = parseISO(date);
    const key = format(d, 'yyyy-MM');
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: format(d, "MMMM yyyy", { locale: es }),
        sessions: [],
      });
    }
    groups.get(key)!.sessions.push(s);
  }

  return Array.from(groups.values())
    .map(g => ({
      ...g,
      label: g.label.charAt(0).toUpperCase() + g.label.slice(1),
      sessions: g.sessions.sort((a, b) => {
        const aDate = a.end_time || a.start_time;
        const bDate = b.end_time || b.start_time;
        return bDate.localeCompare(aDate);
      }),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

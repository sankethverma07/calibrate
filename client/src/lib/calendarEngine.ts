import { MoodType } from './moodEngine';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  predictedMood: MoodType;
  isCustom?: boolean;
}

function gen(): CalendarEvent[] {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const h = (n: number) => new Date(d.getTime() + n * 3600000);
  return [
    { id: '1', title: 'Team Standup', startTime: h(9), endTime: h(9.5), predictedMood: 'locked' },
    { id: '2', title: 'Sprint Deadline', startTime: h(10), endTime: h(12), predictedMood: 'restless' },
    { id: '3', title: 'Lunch Break', startTime: h(12), endTime: h(13), predictedMood: 'drift' },
    { id: '4', title: 'Design Session', startTime: h(14), endTime: h(16), predictedMood: 'cruising' },
    { id: '5', title: 'Gym', startTime: h(17), endTime: h(18), predictedMood: 'cruising' },
    { id: '6', title: 'Coffee with Alex', startTime: h(18.5), endTime: h(19.5), predictedMood: 'drift' },
  ];
}

export function getCalendarEvents(): CalendarEvent[] { return gen(); }

export function getCurrentEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = new Date();
  return events.find(e => now >= e.startTime && now <= e.endTime) || null;
}

export function getNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = new Date();
  return events.filter(e => e.startTime > now).sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0] || null;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

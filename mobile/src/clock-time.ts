// A moment as the clock time the steward reads, "14:32", in the phone's own
// time zone. Empty when the text is not a date.
export function clockTime(iso: string): string {
  const moment = new Date(iso);
  if (Number.isNaN(moment.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(moment.getHours())}:${pad(moment.getMinutes())}`;
}

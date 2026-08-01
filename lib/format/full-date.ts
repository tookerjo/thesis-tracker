const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
});

export function formatFullDate(date: string | Date): string {
  const target = typeof date === "string" ? new Date(date) : date;
  return FULL_DATE_FORMATTER.format(target);
}

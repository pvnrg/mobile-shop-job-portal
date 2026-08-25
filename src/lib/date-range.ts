export function resolveDateRange(from?: string, to?: string) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (from) {
    start = new Date(from + "T00:00:00");
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (to) {
    end = new Date(to + "T23:59:59.999");
  } else {
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

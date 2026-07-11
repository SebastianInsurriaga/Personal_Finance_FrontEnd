export function toDate(dateValue = new Date()) {
  let date;
  if (dateValue instanceof Date) {
    const isDateOnlyUtc =
      dateValue.getUTCHours() === 0 &&
      dateValue.getUTCMinutes() === 0 &&
      dateValue.getUTCSeconds() === 0 &&
      dateValue.getUTCMilliseconds() === 0 &&
      (dateValue.getHours() !== 0 || dateValue.getMinutes() !== 0 || dateValue.getSeconds() !== 0);

    if (isDateOnlyUtc) {
      date = new Date(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate());
    } else {
      date = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    }
  } else {
    date = new Date(`${dateValue}T00:00:00`);
  }
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function startOfWeek(dateValue = new Date()) {
  const date = toDate(dateValue);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function endOfWeek(dateValue = new Date()) {
  const sunday = startOfWeek(dateValue);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

export function startOfMonth(dateValue = new Date()) {
  const date = toDate(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(dateValue = new Date()) {
  const date = toDate(dateValue);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function isBetween(dateValue, start, end) {
  const time = toDate(dateValue).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function daysUntilMonthlyDay(dayOfMonth, dateValue = new Date()) {
  const today = toDate(dateValue);
  const target = new Date(today.getFullYear(), today.getMonth(), Number(dayOfMonth));
  if (target < today) {
    target.setMonth(target.getMonth() + 1);
  }
  return Math.ceil((target - today) / 86400000);
}

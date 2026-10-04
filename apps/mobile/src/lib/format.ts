export function formatRideDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '日付未設定';

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]})`;
}

export function toRideDateInput(dateText: string) {
  const trimmed = dateText.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  const japanDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (japanDate !== trimmed) return null;
  return date.toISOString();
}

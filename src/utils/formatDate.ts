export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  const dow = ['日', '月', '火', '水', '木', '金', '土'];

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekday = dow[d.getDay()];

  return `${year}/${month}/${day}/${weekday}`;
};
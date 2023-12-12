export const dateToString = (t: Date): string => {
  return t
    .toLocaleString('ru-RU', { timeZone: "Europe/Moscow" })
    .slice(0, -3)
    .replace(',', ' в') +
    ' по МСК';
};

export function showFormattedDate(dateString, locale = 'id-ID') {
  const date = new Date(dateString);

  const formattedDate = date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  });

  return `${formattedDate}, ${formattedTime} WIB`;
}
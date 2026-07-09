export function currentDate() {
  const now = new Date();
  const date = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return { date, month, year };
}

export const MONTH_NAMES = [
  '',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const formatDateTimeIndonesia = (date: string | Date) => {
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const d = new Date(date);

  const jakarta = new Date(
    d.toLocaleString('en-US', {
      timeZone: 'Asia/Jakarta',
    }),
  );

  const day = String(jakarta.getDate()).padStart(2, '0');
  const month = months[jakarta.getMonth()];
  const year = jakarta.getFullYear();
  const hour = String(jakarta.getHours()).padStart(2, '0');
  const minute = String(jakarta.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year} jam ${hour}:${minute}`;
};

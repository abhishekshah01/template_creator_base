// Formatting helpers for the Amazon S3 browser — sizes and AWS-style dates.

export function bytesToHuman(bytes) {
  if (bytes == null) return '-';
  const b = Number(bytes);
  if (Number.isNaN(b)) return '-';
  if (b < 1024) return `${b.toFixed(1)} B`.replace('.0 B', ' B');
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let val = b / 1024;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  // AWS shows trailing .0 like "984.0 B" / "11.7 KB" — mimic that.
  return `${val.toFixed(1)} ${units[i]}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Compact form used in dense tables — "Jun 1, 2026, 00:20" (no seconds, no tz).
// Use formatAwsDate() when the full AWS-faithful timestamp is what you want.
export function formatAwsDateCompact(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const month = MONTH_ABBR[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${month} ${day}, ${year}, ${hh}:${mm}`;
}

// AWS format: "October 15, 2025, 20:39:38 (UTC+05:30)"
export function formatAwsDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const tz = formatTz(d.getTimezoneOffset());
  return `${month} ${day}, ${year}, ${hh}:${mm}:${ss} (${tz})`;
}

function formatTz(offsetMin) {
  // getTimezoneOffset returns minutes WEST of UTC; flip the sign for display.
  const sign = offsetMin <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export function fileExt(name) {
  if (!name) return '';
  const i = name.lastIndexOf('.');
  if (i < 0 || i === name.length - 1) return '';
  return name.slice(i + 1).toLowerCase();
}

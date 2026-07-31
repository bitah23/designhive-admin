/**
 * Shared helpers.
 *
 * These used to be copy-pasted into six page scripts, which meant six slightly
 * different versions of the same escaping and date logic. Everything lives here
 * now; page scripts call the globals directly.
 */

/** Escape a value for safe interpolation into an HTML template string. */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** "3 Feb 2026" — the app's standard date format. */
function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3 Feb 2026, 4:05 pm" — date plus time, for logs and schedules. */
function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Pull a human-readable message out of an axios error. */
function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.detail
    || (err?.code === 'ECONNABORTED' ? 'Request timed out — the operation is taking too long.' : null)
    || err?.message
    || fallback;
}

/** Delay `fn` until `wait` ms have passed without another call — for search inputs. */
function debounce(fn, wait = 250) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

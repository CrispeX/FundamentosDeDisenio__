const $ = (selector, root = document) => root.querySelector(selector);

const esc = valor =>
  String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtFecha(iso) {
  if (!iso) return '';
  if (iso.includes('T')) return new Intl.DateTimeFormat('es-CO', {timeZone:'America/Bogota', day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(iso));
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function fmtMoneda(n) {
  return n !== null && n !== undefined && n !== '' ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(n) : '—';
}

let toastTimer;
function toast(mensaje, esError = false) {
  const el = $('#toast');
  el.textContent = mensaje;
  el.className = 'toast visible' + (esError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), 3200);
}

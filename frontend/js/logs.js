let allLogs = [];
let tooltipEl = null;

document.addEventListener('DOMContentLoaded', () => {
  // Create tooltip element (portal to body)
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'log-tooltip';
  tooltipEl.style.cssText = `
    position:fixed;display:none;background:#1A1A2E;color:#fff;
    font-size:12px;padding:8px 12px;border-radius:8px;max-width:400px;
    z-index:9999;pointer-events:none;user-select:text;line-height:1.5;
    border:1px solid rgba(255,255,255,0.08);word-break:break-word`;
  document.body.appendChild(tooltipEl);

  fetchLogs(false);
});

// 8.2 Refresh: spin icon for duration, in-place update, no skeleton on refresh
async function fetchLogs(isRefresh = false) {
  const icon = document.getElementById('refresh-icon');
  const btn = document.getElementById('refresh-btn');

  if (icon) icon.style.animation = 'spin 0.7s linear infinite';
  if (btn) btn.disabled = true;

  // First load only — show skeleton
  if (!isRefresh) {
    document.getElementById('logs-card').innerHTML =
      `<div style="padding:16px">${[...Array(5)].map(() =>
        `<div class="users-skeleton-row" style="margin-bottom:10px"></div>`).join('')}</div>`;
  }

  try {
    allLogs = await api.get('/logs');
    // Counters always based on FULL unfiltered list
    document.getElementById('sent-count').textContent = allLogs.filter(l => l.status === 'sent').length;
    document.getElementById('failed-count').textContent = allLogs.filter(l => l.status === 'failed').length;
    applyFilters();

    // 8.2 'Updated just now' label for 3s after refresh
    if (isRefresh) {
      const updatedEl = document.getElementById('updated-label');
      if (updatedEl) {
        updatedEl.textContent = 'Updated just now';
        updatedEl.style.opacity = '1';
        setTimeout(() => { updatedEl.style.opacity = '0'; }, 3000);
      }
    }
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message);
  } finally {
    if (icon) icon.style.animation = '';
    if (btn) btn.disabled = false;
  }
}

// 8.2 Client-side memoized filters — no re-fetch
function applyFilters() {
  const status = document.getElementById('status-filter').value;
  const date = document.getElementById('date-filter').value;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const filtered = allLogs.filter(l => {
    if (status !== 'all' && l.status !== status) return false;
    if (date === 'today') return new Date(l.timestamp) >= today;
    if (date === 'yesterday') { const d = new Date(l.timestamp); return d >= yesterday && d < today; }
    return true;
  });

  renderTable(filtered);
}

function renderTable(logs) {
  if (logs.length === 0) {
    document.getElementById('logs-card').innerHTML = `
      <div class="empty-state">
        <i data-lucide="inbox" style="width:40px;height:40px;opacity:0.2;margin-bottom:10px"></i>
        <p>No logs match your filters.</p>
      </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const rows = logs.map(l => {
    // 8.2 Deleted template fallback
    const tplTitle = l.email_templates?.title
      ? esc(l.email_templates.title)
      : `<em style="color:var(--text-muted)">Deleted Template</em>`;

    const hasError = l.error_message && l.error_message !== '—';

    return `<tr>
      <td class="bold" style="padding-left:20px;color:var(--text-sub)">${esc(l.user_email)}</td>
      <td>${tplTitle}</td>
      <td><span class="badge ${l.status === 'sent' ? 'badge-gold' : 'badge-red'}">${l.status.toUpperCase()}</span></td>
      <td class="text-muted" style="white-space:nowrap">${fmt(l.timestamp)}</td>
      <td style="max-width:260px">
        ${hasError
        ? `<span class="log-error-cell"
               style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--danger);font-size:0.75rem;cursor:default"
               data-err="${esc(l.error_message)}"
               onmouseenter="showTooltip(event,this.dataset.err)"
               onmouseleave="hideTooltip()"
               onmousemove="moveTooltip(event)">${esc(l.error_message)}</span>`
        : `<span style="color:var(--text-muted)">—</span>`}
      </td>
    </tr>`;
  }).join('');

  document.getElementById('logs-card').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="padding-left:20px">EMAIL</th>
            <th>TEMPLATE</th>
            <th>STATUS</th>
            <th>TIME</th>
            <th>ERROR</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// 8.2 Tooltip portal — fixed position, body-appended, selectable text
function showTooltip(e, text) {
  if (!tooltipEl || !text) return;
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  moveTooltip(e);
}
function moveTooltip(e) {
  if (!tooltipEl) return;
  const x = e.clientX + 14;
  const y = e.clientY + 14;
  tooltipEl.style.left = `${Math.min(x, window.innerWidth - 420)}px`;
  tooltipEl.style.top = `${y}px`;
}
function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// en-AU, 12h clock: '18 Apr 2026, 10:16 am'
function fmt(ts) {
  return new Date(ts).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

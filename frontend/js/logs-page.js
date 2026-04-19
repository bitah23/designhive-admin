let allLogs = [];
let tooltipEl = null;

document.getElementById('status-filter').addEventListener('change', applyFilters);
document.getElementById('date-filter').addEventListener('change', applyFilters);
document.getElementById('refresh-btn').addEventListener('click', () => fetchLogs(true));

document.addEventListener('DOMContentLoaded', () => {
  tooltipEl = document.createElement('div');
  tooltipEl.style.cssText = `
    position:fixed;
    display:none;
    max-width:400px;
    padding:8px 10px;
    border-radius:8px;
    background:${getCssVar('--tooltip-bg')};
    color:${getCssVar('--text-primary')};
    font-size:12px;
    line-height:1.5;
    z-index:9999;
    user-select:text;
  `;
  document.body.appendChild(tooltipEl);
  fetchLogs(false);
});

async function fetchLogs(isRefresh) {
  const icon = document.getElementById('refresh-icon');
  const updatedLabel = document.getElementById('updated-label');

  icon.style.animation = 'spin 0.7s linear infinite';
  document.getElementById('refresh-btn').disabled = true;

  if (!isRefresh) {
    document.getElementById('logs-card').innerHTML = `
      <div style="padding:16px">
        <div class="skeleton users-skeleton-row"></div>
        <div class="skeleton users-skeleton-row"></div>
        <div class="skeleton users-skeleton-row"></div>
        <div class="skeleton users-skeleton-row"></div>
        <div class="skeleton users-skeleton-row"></div>
      </div>
    `;
  }

  try {
    allLogs = await api.get('/logs');
    document.getElementById('sent-count').textContent = allLogs.filter(item => item.status === 'sent').length;
    document.getElementById('failed-count').textContent = allLogs.filter(item => item.status === 'failed').length;
    applyFilters();

    if (isRefresh) {
      updatedLabel.classList.add('visible');
      setTimeout(() => updatedLabel.classList.remove('visible'), 3000);
    }
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to load logs.');
  } finally {
    const currentIcon = document.getElementById('refresh-icon');
    if (currentIcon) currentIcon.style.animation = '';
    document.getElementById('refresh-btn').disabled = false;
    redrawIcons();
  }
}

function applyFilters() {
  const status = document.getElementById('status-filter').value;
  const date = document.getElementById('date-filter').value;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const filtered = allLogs.filter(log => {
    if (status !== 'all' && log.status !== status) return false;
    if (date === 'today') return new Date(log.timestamp) >= today;
    if (date === 'yesterday') {
      const timestamp = new Date(log.timestamp);
      return timestamp >= yesterday && timestamp < today;
    }
    return true;
  });

  renderLogs(filtered);
}

function renderLogs(logs) {
  if (!logs.length) {
    document.getElementById('logs-card').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="inbox" style="width:24px;height:24px"></i></div>
        <h3 style="margin:0 0 8px;color:var(--text-primary)">No emails sent yet.</h3>
        <p style="margin:0 0 16px;color:var(--text-muted)">Send your first campaign.</p>
        <a href="/campaign.html" class="btn btn-outline">Send Campaign</a>
      </div>
    `;
    redrawIcons();
    return;
  }

  document.getElementById('logs-card').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>EMAIL</th>
            <th>TEMPLATE</th>
            <th>STATUS</th>
            <th>TIME</th>
            <th>ERROR</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr>
              <td>${escapeHtml(log.user_email)}</td>
              <td>${log.email_templates?.title ? escapeHtml(log.email_templates.title) : '<em class="text-muted">Deleted Template</em>'}</td>
              <td><span class="badge ${log.status === 'sent' ? 'badge-green' : 'badge-red'}">${escapeHtml(log.status.toUpperCase())}</span></td>
              <td class="text-muted">${formatLogDate(log.timestamp)}</td>
              <td>${renderErrorCell(log.error_message)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll('[data-tooltip]').forEach(element => {
    element.addEventListener('mouseenter', event => showTooltip(event, element.dataset.tooltip));
    element.addEventListener('mousemove', moveTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });

  redrawIcons();
}

function renderErrorCell(error) {
  if (!error) {
    return '<span class="text-muted">--</span>';
  }

  return `<span data-tooltip="${escapeAttr(error)}" style="display:block;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--danger);cursor:default">${escapeHtml(error)}</span>`;
}

function showTooltip(event, text) {
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  moveTooltip(event);
}

function moveTooltip(event) {
  const left = Math.min(event.clientX + 12, window.innerWidth - 420);
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${event.clientY + 12}px`;
}

function hideTooltip() {
  tooltipEl.style.display = 'none';
}

function formatLogDate(value) {
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function redrawIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

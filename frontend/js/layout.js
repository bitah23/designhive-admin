const NAV = [
  { href: '/dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
  { href: '/users.html', icon: 'users', label: 'Users' },
  { href: '/templates.html', icon: 'file-text', label: 'Templates' },
  { href: '/campaign.html', icon: 'send', label: 'Campaign' },
  { href: '/agents.html', icon: 'bot', label: 'Agents' },
  { href: '/logs.html', icon: 'history', label: 'Logs' },
  { href: '/settings.html', icon: 'settings', label: 'Settings' }
];

const PAGE_META = {
  '/dashboard.html': { title: 'Dashboard', subtitle: 'System-wide campaign health and recent template activity' },
  '/users.html': { title: 'Users', subtitle: 'Search recipients and send direct outreach' },
  '/templates.html': { title: 'Email Templates', subtitle: 'Create, preview, edit, and remove reusable email content' },
  '/campaign.html': { title: 'Campaign', subtitle: 'Choose one template and a recipient segment, then send' },
  '/agents.html': { title: 'Agents', subtitle: 'Monitor, trigger, and manage all 10 automated agents' },
  '/logs.html': { title: 'Email Logs', subtitle: 'Inspect send history, statuses, timestamps, and errors' },
  '/settings.html': { title: 'Settings', subtitle: 'Manage admins and update account security' }
};

function initLayout() {
  const path = window.location.pathname;
  const meta = PAGE_META[path] || { title: 'DesignHive Admin', subtitle: 'Admin tools' };

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const navHTML = NAV.map(item => `
      <a href="${item.href}" class="nav-link ${path === item.href ? 'active' : ''}">
        <i data-lucide="${item.icon}" style="width:16px;height:16px;flex-shrink:0"></i>
        <span>${item.label}</span>
      </a>
    `).join('');

    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <a href="/dashboard.html" class="sidebar-logo-link">
          <div class="sidebar-logo-mark">
            <img src="/assets/brand/logo.png" alt="Design Hive logo">
          </div>
        </a>
      </div>
      <nav class="sidebar-nav">
        <div class="label-upper mb-2" style="padding-left:4px">Menu</div>
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <button class="nav-link logout" type="button" onclick="logout()">
          <i data-lucide="log-out" style="width:16px;height:16px;flex-shrink:0"></i>
          <span>Sign Out</span>
        </button>
      </div>
    `;
  }

  const topbar = document.getElementById('topbar');
  if (topbar) {
    topbar.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" id="mobile-toggle">
          <i data-lucide="menu" style="width:20px;height:20px"></i>
        </button>
        <div class="page-title-group">
          <div class="page-title">${meta.title}</div>
          <div class="page-subtitle">${meta.subtitle}</div>
        </div>
      </div>
      <span class="admin-badge">Admin</span>
    `;

    // Add Overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    // Toggle Logic
    const toggleBtn = document.getElementById('mobile-toggle');
    const closeSidebar = () => document.body.classList.remove('sidebar-open');
    
    toggleBtn?.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });

    overlay.addEventListener('click', closeSidebar);
    
    // Close sidebar on nav link click (for mobile)
    sidebar?.addEventListener('click', (e) => {
      if (e.target.closest('.nav-link')) {
        closeSidebar();
      }
    });
  }

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function logout() {
  localStorage.removeItem('adminToken');
  window.location.href = '/login.html';
}

function getCurrentAdmin() {
  const token = localStorage.getItem('adminToken');
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (err) {
    return null;
  }
}

function showWelcomeMessage() {
  try {
    const showWelcome = localStorage.getItem('showWelcome');
    if (showWelcome !== 'true') return;

    const admin = getCurrentAdmin();
    let adminName = 'Admin';
    
    if (admin) {
      const namePart = admin.email || admin.sub || admin.id || '';
      if (namePart && typeof namePart === 'string' && namePart.includes('@')) {
        adminName = namePart.split('@')[0].split(/[._-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      } else if (namePart) {
        adminName = namePart;
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon-wrap">
          <i data-lucide="sparkles" style="width:48px;height:48px"></i>
        </div>
        <h1 class="welcome-title">Welcome Back, ${adminName}!</h1>
        <p class="welcome-subtitle">Mission control is fully operational. We've prepared everything for your next campaign.</p>
        <div class="flex-center" style="justify-content:center">
          <button class="btn btn-primary welcome-action-btn" id="welcome-dismiss">
            <span>Enter Dashboard</span>
            <i data-lucide="arrow-right" style="width:18px;height:18px"></i>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({
        nameAttr: 'data-lucide'
      });
    }

    setTimeout(() => {
      overlay.classList.add('active');
    }, 400);

    const dismissBtn = document.getElementById('welcome-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          localStorage.removeItem('showWelcome');
        }, 800);
      });
    }
  } catch (err) {
    console.error('Welcome message error:', err);
  }
}

window.DesignHiveLayout = {
  getCurrentAdmin
};

// ---------------------------------------------------------------------------
// AI Chat Drawer
// ---------------------------------------------------------------------------

function initChat() {
  // Inject drawer markup
  const drawer = document.createElement('div');
  drawer.id = 'chat-drawer';
  drawer.innerHTML = `
    <div id="chat-backdrop"></div>
    <div id="chat-panel">
      <div id="chat-header">
        <div style="display:flex;align-items:center;gap:10px">
          <i data-lucide="bot" style="width:18px;height:18px;color:var(--gold)"></i>
          <span style="font-weight:700;color:var(--text-primary)">AI Assistant</span>
        </div>
        <button id="chat-close-btn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px">
          <i data-lucide="x" style="width:18px;height:18px"></i>
        </button>
      </div>
      <div id="chat-messages">
        <div class="chat-msg chat-msg--ai">
          <span>Hi! I can send campaigns, schedule emails, generate content, run agents, and pull stats — just tell me what you need.</span>
        </div>
      </div>
      <div id="chat-input-row">
        <textarea id="chat-input" rows="1" placeholder="Ask me anything…"></textarea>
        <button id="chat-send-btn">
          <i data-lucide="send" style="width:16px;height:16px"></i>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #chat-drawer { display:none; }
    #chat-drawer.open { display:block; }
    #chat-backdrop {
      position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;
    }
    #chat-panel {
      position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;
      background:var(--bg-card);border-left:1px solid var(--border);
      display:flex;flex-direction:column;z-index:1001;
    }
    #chat-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;
    }
    #chat-messages {
      flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;
    }
    .chat-msg {
      max-width:88%;padding:10px 14px;border-radius:10px;
      font-size:14px;line-height:1.55;word-break:break-word;
    }
    .chat-msg--ai {
      background:var(--bg-card-alt);border:1px solid var(--border);
      color:var(--text-secondary);align-self:flex-start;border-bottom-left-radius:3px;
    }
    .chat-msg--user {
      background:var(--gold);color:#000;align-self:flex-end;
      border-bottom-right-radius:3px;font-weight:600;
    }
    .chat-msg--thinking {
      background:var(--bg-card-alt);border:1px solid var(--border);
      color:var(--text-muted);align-self:flex-start;font-style:italic;
    }
    #chat-input-row {
      display:flex;align-items:flex-end;gap:8px;
      padding:12px 16px;border-top:1px solid var(--border);flex-shrink:0;
    }
    #chat-input {
      flex:1;background:var(--bg-input);border:1px solid var(--border);
      border-radius:8px;color:var(--text-primary);padding:10px 12px;
      resize:none;max-height:120px;overflow-y:auto;line-height:1.4;
    }
    #chat-input:focus { outline:none;border-color:var(--gold); }
    #chat-send-btn {
      background:var(--gold);color:#000;border:none;border-radius:8px;
      width:38px;height:38px;cursor:pointer;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;
    }
    #chat-send-btn:disabled { opacity:0.5;cursor:default; }

    /* ── Agent trace logs ─────────────────────────────────── */
    .chat-trace {
      align-self:flex-start;width:88%;font-size:12px;
    }
    .chat-trace-toggle {
      display:flex;align-items:center;gap:6px;
      background:none;border:1px solid var(--border);border-radius:8px;
      color:var(--text-muted);padding:5px 10px;cursor:pointer;
      font-size:11px;width:100%;text-align:left;
    }
    .chat-trace-toggle:hover { border-color:var(--gold);color:var(--text-primary); }
    .chat-trace-toggle .trace-chevron {
      margin-left:auto;transition:transform 0.2s;
    }
    .chat-trace.open .trace-chevron { transform:rotate(180deg); }
    .chat-trace-body {
      display:none;margin-top:4px;border:1px solid var(--border);
      border-radius:8px;overflow:hidden;
    }
    .chat-trace.open .chat-trace-body { display:block; }
    .trace-step {
      border-bottom:1px solid var(--border);
    }
    .trace-step:last-child { border-bottom:none; }
    .trace-step-header {
      display:flex;align-items:center;gap:8px;
      padding:7px 10px;cursor:pointer;
      background:var(--bg-card-alt);
    }
    .trace-step-header:hover { background:var(--bg-input); }
    .trace-step-num {
      font-size:10px;font-weight:700;color:var(--text-muted);
      min-width:16px;text-align:center;
    }
    .trace-status-dot {
      width:7px;height:7px;border-radius:50%;flex-shrink:0;
    }
    .trace-status-dot.ok  { background:#22c55e; }
    .trace-status-dot.error { background:#ef4444; }
    .trace-tool-name {
      font-weight:600;color:var(--text-primary);flex:1;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .trace-summary {
      color:var(--text-muted);font-size:11px;
      flex:2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .trace-duration {
      font-size:10px;color:var(--text-muted);
      background:var(--bg-input);border-radius:4px;
      padding:1px 5px;flex-shrink:0;
    }
    .trace-duration.slow { color:#f59e0b; }
    .trace-detail {
      display:none;padding:8px 10px;
      background:var(--bg-card);border-top:1px solid var(--border);
    }
    .trace-step.detail-open .trace-detail { display:block; }
    .trace-detail-section { margin-bottom:6px; }
    .trace-detail-label {
      font-size:10px;font-weight:700;color:var(--text-muted);
      text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;
    }
    .trace-detail-code {
      font-family:monospace;font-size:11px;color:var(--text-secondary);
      background:var(--bg-input);border-radius:5px;padding:6px 8px;
      white-space:pre-wrap;word-break:break-word;max-height:140px;overflow-y:auto;
    }
    .trace-detail-code.error-text { color:#f87171; }
  `;
  document.head.appendChild(style);

  // Re-run lucide for new icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  const openBtn   = document.getElementById('chat-open-btn');
  const closeBtn  = document.getElementById('chat-close-btn');
  const backdrop  = document.getElementById('chat-backdrop');
  const sendBtn   = document.getElementById('chat-send-btn');
  const input     = document.getElementById('chat-input');
  const messages  = document.getElementById('chat-messages');

  function openDrawer()  { drawer.classList.add('open'); input.focus(); }
  function closeDrawer() { drawer.classList.remove('open'); }

  openBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  // Auto-grow textarea
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn?.addEventListener('click', sendMessage);

  const TOOL_LABELS = {
    list_templates:          'List Templates',
    segment_users:           'Segment Users',
    send_campaign_now:       'Send Campaign',
    schedule_campaign:       'Schedule Campaign',
    generate_content:        'Generate Content',
    run_reengagement:        'Re-engagement Agent',
    run_failure_recovery:    'Failure Recovery Agent',
    get_email_stats:         'Email Stats',
    list_scheduled_campaigns:'List Scheduled Campaigns',
    get_campaign_report:     'Campaign Report',
    save_template:           'Save Template',
  };

  function appendMsg(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function appendLogs(logs) {
    if (!logs || !logs.length) return;

    const hasError = logs.some(l => l.status === 'error');
    const totalMs  = logs.reduce((s, l) => s + (l.duration_ms || 0), 0);
    const stepWord = logs.length === 1 ? 'step' : 'steps';
    const errLabel = hasError ? ' · ⚠ error' : '';
    const timeLabel = totalMs >= 1000
      ? `${(totalMs / 1000).toFixed(1)}s`
      : `${totalMs}ms`;

    const trace = document.createElement('div');
    trace.className = 'chat-trace';

    // Toggle button
    const toggle = document.createElement('button');
    toggle.className = 'chat-trace-toggle';
    toggle.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span>Agent trace · ${logs.length} ${stepWord} · ${timeLabel}${errLabel}</span>
      <svg class="trace-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    toggle.addEventListener('click', () => trace.classList.toggle('open'));

    // Steps body
    const body = document.createElement('div');
    body.className = 'chat-trace-body';

    logs.forEach(log => {
      const isError = log.status === 'error';
      const durationMs = log.duration_ms || 0;
      const isSlow = durationMs > 3000;
      const label = TOOL_LABELS[log.tool] || log.tool;

      // Input: filter out empty objects
      const inputStr = log.input && Object.keys(log.input).length
        ? JSON.stringify(log.input, null, 2)
        : '(no input)';

      // Result detail: show full result_detail if available, else summary
      let resultStr;
      if (isError) {
        resultStr = log.result_summary || 'Unknown error';
      } else {
        resultStr = log.result_detail
          ? JSON.stringify(log.result_detail, null, 2)
          : (log.result_summary || '—');
      }

      const step = document.createElement('div');
      step.className = 'trace-step';
      step.innerHTML = `
        <div class="trace-step-header">
          <span class="trace-step-num">${log.step}</span>
          <span class="trace-status-dot ${isError ? 'error' : 'ok'}"></span>
          <span class="trace-tool-name">${label}</span>
          <span class="trace-summary">${log.result_summary || ''}</span>
          <span class="trace-duration ${isSlow ? 'slow' : ''}">${durationMs >= 1000 ? (durationMs/1000).toFixed(1)+'s' : durationMs+'ms'}</span>
        </div>
        <div class="trace-detail">
          <div class="trace-detail-section">
            <div class="trace-detail-label">Input</div>
            <div class="trace-detail-code">${escHtml(inputStr)}</div>
          </div>
          <div class="trace-detail-section">
            <div class="trace-detail-label">${isError ? 'Error' : 'Result'}</div>
            <div class="trace-detail-code ${isError ? 'error-text' : ''}">${escHtml(resultStr)}</div>
          </div>
        </div>
      `;

      step.querySelector('.trace-step-header').addEventListener('click', () => {
        step.classList.toggle('detail-open');
      });

      body.appendChild(step);
    });

    trace.appendChild(toggle);
    trace.appendChild(body);
    messages.appendChild(trace);
    messages.scrollTop = messages.scrollHeight;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    appendMsg(text, 'user');
    const thinking = appendMsg('Thinking…', 'thinking');

    try {
      const data = await api.post('/agents/chat', { message: text });
      thinking.remove();
      appendMsg(data.reply || 'Done.', 'ai');
      if (data.logs && data.logs.length) appendLogs(data.logs);
    } catch (err) {
      thinking.remove();
      const detail = err?.response?.data?.detail || 'Something went wrong. Please try again.';
      appendMsg(detail, 'ai');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }
}

function init() {
  initLayout();
  showWelcomeMessage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

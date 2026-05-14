const NAV = [
  { href: '/dashboard.html', icon: 'layout-dashboard', label: 'Dashboard' },
  { href: '/users.html', icon: 'users', label: 'Users' },
  { href: '/templates.html', icon: 'file-text', label: 'Templates' },
  { href: '/campaign.html', icon: 'send', label: 'Campaign' },
  { href: '/logs.html', icon: 'history', label: 'Logs' },
  { href: '/settings.html', icon: 'settings', label: 'Settings' }
];

const PAGE_META = {
  '/dashboard.html': { title: 'Dashboard', subtitle: 'System-wide campaign health and recent template activity' },
  '/users.html': { title: 'Users', subtitle: 'Search recipients and send direct outreach' },
  '/templates.html': { title: 'Email Templates', subtitle: 'Create, preview, edit, and remove reusable email content' },
  '/campaign.html': { title: 'Campaign', subtitle: 'Choose one template and a recipient segment, then send' },
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
        <button class="nav-link" type="button" id="chat-open-btn" style="color:var(--text-gold)">
          <i data-lucide="bot" style="width:16px;height:16px;flex-shrink:0"></i>
          <span>AI Assistant</span>
        </button>
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

  function appendMsg(text, role) {
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
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
  initChat();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

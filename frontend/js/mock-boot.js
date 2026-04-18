const DH_MOCK_MODE_KEY = 'designhiveMockMode';
const DH_TOKEN_KEY = 'adminToken';

(function initMockMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mock') === '1') localStorage.setItem(DH_MOCK_MODE_KEY, '1');
  if (params.get('mock') === '0') localStorage.removeItem(DH_MOCK_MODE_KEY);
  if (!localStorage.getItem(DH_MOCK_MODE_KEY) && params.get('mock') !== '0') {
    localStorage.setItem(DH_MOCK_MODE_KEY, '1');
  }
  if (isMockMode() && !localStorage.getItem(DH_TOKEN_KEY)) {
    localStorage.setItem(DH_TOKEN_KEY, getMockToken());
  }
})();

function isMockMode() {
  return localStorage.getItem(DH_MOCK_MODE_KEY) === '1';
}

function getMockToken() {
  const payload = btoa(JSON.stringify({ id: 'admin-1', email: 'admin@designhive.local', role: 'admin', mock: true }));
  return `mock.${payload}.sig`;
}

function isoOffset(days = 0, hours = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

const mockDb = {
  templates: [
    {
      id: 'tpl-1',
      title: 'Welcome Flow',
      subject: 'Welcome to DesignHive',
      body: '<h1 style="margin:0 0 12px;font-size:32px;line-height:1.1;color:#0f172a">Welcome to DesignHive, {{name}}</h1><p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155">Your admin toolkit is live and ready to help you move from first draft to delivery with more control.</p><p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">We built your workspace for {{email}} with campaign controls, template previews, delivery visibility, and team-safe workflows.</p><div style="display:inline-block;padding:14px 22px;border-radius:999px;background:#a31f45;color:#ffffff;font-weight:700;text-decoration:none">Open Dashboard</div><div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px;line-height:1.7">Questions? Reply anytime and our operators will help. <br> The DesignHive AI team</div>',
      created_at: isoOffset(-6),
    },
    {
      id: 'tpl-2',
      title: 'Promo Launch',
      subject: 'Your next campaign is live',
      body: '<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#a31f45">Campaign Update</p><h1 style="margin:0 0 14px;font-size:30px;line-height:1.1;color:#0f172a">Your next campaign is ready to launch</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#334155">Hi {{name}}, your DesignHive workflow has a fresh promotional draft lined up for {{date}} with updated content blocks and improved delivery pacing.</p><ul style="margin:0 0 24px;padding-left:18px;color:#475569;line-height:1.8"><li>Sharper content hierarchy</li><li>Better send visibility</li><li>Cleaner admin review flow</li></ul><div style="display:inline-block;padding:14px 22px;border-radius:999px;background:#a31f45;color:#ffffff;font-weight:700;text-decoration:none">Review in Dashboard</div><div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px;line-height:1.7">DesignHive AI keeps every launch polished, measurable, and easier to manage. <br> The DesignHive AI team</div>',
      created_at: isoOffset(-2),
    },
  ],
  users: [
    { id: 'usr-1', name: 'Ava Collins', email: 'ava@example.com', created_at: isoOffset(-14) },
    { id: 'usr-2', name: 'Noah Smith', email: 'noah@example.com', created_at: isoOffset(-10) },
    { id: 'usr-3', name: 'Mia Patel', email: 'mia@example.com', created_at: isoOffset(-4) },
    { id: 'usr-4', name: 'Liam Chen', email: 'liam@example.com', created_at: isoOffset(-1) },
    { id: 'usr-5', name: 'Olivia Reed', email: 'olivia@example.com', created_at: isoOffset(-12) },
    { id: 'usr-6', name: 'Ethan Brooks', email: 'ethan@example.com', created_at: isoOffset(-11) },
    { id: 'usr-7', name: 'Sophia Malik', email: 'sophia@example.com', created_at: isoOffset(-9) },
    { id: 'usr-8', name: 'Mason Grant', email: 'mason@example.com', created_at: isoOffset(-8) },
    { id: 'usr-9', name: 'Amelia Khan', email: 'amelia@example.com', created_at: isoOffset(-7) },
    { id: 'usr-10', name: 'Lucas Moore', email: 'lucas@example.com', created_at: isoOffset(-6) },
    { id: 'usr-11', name: 'Harper Stone', email: 'harper@example.com', created_at: isoOffset(-5) },
    { id: 'usr-12', name: 'Logan Hale', email: 'logan@example.com', created_at: isoOffset(-3) },
  ],
  logs: [
    {
      id: 'log-1',
      user_email: 'ava@example.com',
      email_templates: { title: 'Welcome Flow' },
      status: 'sent',
      timestamp: isoOffset(0, -2),
      error_message: null,
    },
    {
      id: 'log-2',
      user_email: 'mia@example.com',
      email_templates: { title: 'Promo Launch' },
      status: 'failed',
      timestamp: isoOffset(-1, -5),
      error_message: 'Mailbox rejected the message',
    },
    {
      id: 'log-3',
      user_email: 'noah@example.com',
      email_templates: { title: 'Promo Launch' },
      status: 'sent',
      timestamp: isoOffset(-3, -3),
      error_message: null,
    },
  ],
  admins: [
    { id: 'admin-1', name: 'Test Admin', email: 'admin@designhive.local', is_active: true },
    { id: 'admin-2', name: 'Ops Reviewer', email: 'ops@designhive.local', is_active: true },
  ],
};

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') return JSON.parse(body);
  return body;
}

function ok(data, status = 200) {
  return Promise.resolve(new Response(data == null ? '' : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function handleMockApi(pathname, method, body) {
  if (pathname === '/api/auth/login' && method === 'POST') {
    return ok({
      token: getMockToken(),
      admin: { id: 'admin-1', email: body.email || 'admin@designhive.local' },
    });
  }

  if (pathname === '/api/auth/reset-request' && method === 'POST') return ok({ ok: true });
  if (pathname === '/api/auth/reset-password' && method === 'POST') return ok({ ok: true });
  if (pathname === '/api/users' && method === 'GET') return ok(clone(mockDb.users));
  if (pathname === '/api/logs' && method === 'GET') return ok(clone(mockDb.logs));
  if (pathname === '/api/admins' && method === 'GET') return ok(clone(mockDb.admins));
  if (pathname === '/api/templates' && method === 'GET') return ok(clone(mockDb.templates));

  if (pathname === '/api/admins' && method === 'POST') {
    const admin = {
      id: makeId('admin'),
      name: body.name || null,
      email: body.email,
      is_active: true,
    };
    mockDb.admins.push(admin);
    return ok(clone(admin));
  }

  const adminToggle = pathname.match(/^\/api\/admins\/([^/]+)\/toggle$/);
  if (adminToggle && method === 'PATCH') {
    const admin = mockDb.admins.find(item => item.id === adminToggle[1]);
    if (!admin) return ok({ detail: 'Admin not found' }, 404);
    admin.is_active = !admin.is_active;
    return ok(clone(admin));
  }

  const adminDelete = pathname.match(/^\/api\/admins\/([^/]+)$/);
  if (adminDelete && method === 'DELETE') {
    mockDb.admins = mockDb.admins.filter(item => item.id !== adminDelete[1]);
    return ok(null, 204);
  }

  if (pathname === '/api/templates' && method === 'POST') {
    const template = {
      id: makeId('tpl'),
      title: body.title,
      subject: body.subject,
      body: body.body,
      created_at: new Date().toISOString(),
    };
    mockDb.templates.unshift(template);
    return ok(clone(template));
  }

  const templatePath = pathname.match(/^\/api\/templates\/([^/]+)$/);
  if (templatePath && method === 'PUT') {
    const template = mockDb.templates.find(item => item.id === templatePath[1]);
    if (!template) return ok({ detail: 'Template not found' }, 404);
    Object.assign(template, { title: body.title, subject: body.subject, body: body.body });
    return ok(clone(template));
  }

  if (templatePath && method === 'DELETE') {
    mockDb.templates = mockDb.templates.filter(item => item.id !== templatePath[1]);
    return ok(null, 204);
  }

  if (pathname === '/api/email/send-direct' && method === 'POST') {
    mockDb.logs.unshift({
      id: makeId('log'),
      user_email: body.to,
      email_templates: { title: 'Direct Email' },
      status: 'sent',
      timestamp: new Date().toISOString(),
      error_message: null,
    });
    return ok({ ok: true });
  }

  if (pathname === '/api/email/send' && method === 'POST') {
    const template = mockDb.templates.find(item => item.id === body.template_id);
    const results = mockDb.users
      .filter(user => body.user_ids.includes(user.id))
      .map(user => ({ email: user.email, status: 'sent', error: null }));

    results.forEach(result => {
      mockDb.logs.unshift({
        id: makeId('log'),
        user_email: result.email,
        email_templates: { title: template?.title || 'Campaign' },
        status: 'sent',
        timestamp: new Date().toISOString(),
        error_message: null,
      });
    });

    return ok({ results });
  }

  return ok({ detail: `Mock route not implemented: ${method} ${pathname}` }, 404);
}

if (isMockMode()) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? new URL(input, window.location.origin) : new URL(input.url, window.location.origin);
    if (!url.pathname.startsWith('/api')) return originalFetch(input, init);
    return handleMockApi(url.pathname, (init.method || 'GET').toUpperCase(), parseBody(init.body));
  };
}

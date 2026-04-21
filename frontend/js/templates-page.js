let quill;
let templates = [];
let editingId = null;
let htmlMode = false;

const templatesGrid = document.getElementById('templates-grid');
const templateModal = document.getElementById('template-modal');
const previewModal = document.getElementById('preview-modal');
const templateForm = document.getElementById('template-form');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const htmlEditor = document.getElementById('html-editor');
const quillWrap = document.getElementById('quill-wrap');
const saveTemplateBtn = document.getElementById('save-template-btn');

window.openTemplateModal = openTemplateModal;
window.openPreview = openPreview;
window.deleteTemplate = deleteTemplate;

document.getElementById('new-template-btn').addEventListener('click', () => openTemplateModal(null));
document.getElementById('close-template-modal').addEventListener('click', closeTemplateModal);
document.getElementById('cancel-template-btn').addEventListener('click', closeTemplateModal);
document.getElementById('close-preview-modal').addEventListener('click', closePreviewModal);
toggleModeBtn.addEventListener('click', toggleEditorMode);
templateForm.addEventListener('submit', saveTemplate);
document.querySelectorAll('.variable-chip').forEach(button => {
  button.addEventListener('click', () => insertVariable(button.dataset.variable));
});

document.addEventListener('DOMContentLoaded', async () => {
  initQuill();
  await loadTemplates();
  redrawIcons();
});

function initQuill() {
  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write your email here...',
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean']
      ]
    }
  });
}

async function loadTemplates() {
  try {
    templates = await api.get('/templates');
    renderTemplateGrid();
  } catch (error) {
    const message = error.response?.data?.detail || error.message || 'Failed to load templates.';
    Toast.error(message);
    templatesGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i data-lucide="file-text" style="width:24px;height:24px"></i></div><p>${escapeHtml(message)}</p></div>`;
    redrawIcons();
  }
}

function renderTemplateGrid() {
  if (!templates.length) {
    templatesGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon"><i data-lucide="file-text" style="width:24px;height:24px"></i></div>
        <h3 style="margin:0 0 8px;color:var(--text-primary)">No templates yet.</h3>
        <p style="margin:0 0 16px;color:var(--text-muted)">Create your first one.</p>
        <button class="btn btn-primary" type="button" onclick="openTemplateModal(null)">
          <i data-lucide="plus" style="width:14px;height:14px"></i>
          New Template
        </button>
      </div>
    `;
    redrawIcons();
    return;
  }

  templatesGrid.innerHTML = templates.map(template => `
    <div class="card template-card">
      <div class="flex-between mb-2">
        <div style="min-width:0;padding-right:10px">
          <div class="t-title">${escapeHtml(template.title)}</div>
          <div class="t-subject">${escapeHtml(template.subject)}</div>
        </div>
        <div class="t-actions flex-shrink-0">
          <button class="btn-icon" type="button" title="Preview" onclick="openPreview('${escapeAttr(template.id)}')">
            <i data-lucide="eye" style="width:14px;height:14px;color:var(--gold-strong)"></i>
          </button>
          <button class="btn-icon" type="button" title="Edit" onclick="openTemplateModal('${escapeAttr(template.id)}')">
            <i data-lucide="pencil" style="width:14px;height:14px"></i>
          </button>
          <button class="btn-icon" type="button" title="Delete" onclick="deleteTemplate('${escapeAttr(template.id)}')">
            <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger)"></i>
          </button>
        </div>
      </div>
      <div class="t-preview">${escapeHtml(stripHtml(template.body))}</div>
    </div>
  `).join('');

  redrawIcons();
}

function openTemplateModal(id) {
  editingId = id;
  const template = id ? templates.find(item => item.id === id) : null;
  const body = template?.body || getDefaultTemplateBody();

  document.getElementById('modal-template-title').textContent = template ? 'Edit Template' : 'New Template';
  document.getElementById('t-title').value = template?.title || '';
  document.getElementById('t-subject').value = template?.subject || '';

  htmlMode = false;
  htmlEditor.style.display = 'none';
  quillWrap.style.display = '';
  toggleModeBtn.innerHTML = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  saveTemplateBtn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${template ? 'Save Changes' : 'Save Template'}`;

  quill.setContents([]);
  quill.clipboard.dangerouslyPasteHTML(body);
  htmlEditor.value = body;

  templateModal.classList.remove('hidden');
  redrawIcons();
}

function closeTemplateModal() {
  templateModal.classList.add('hidden');
  editingId = null;
}

function toggleEditorMode() {
  htmlMode = !htmlMode;

  if (htmlMode) {
    htmlEditor.value = quill.root.innerHTML;
    quillWrap.style.display = 'none';
    htmlEditor.style.display = '';
    toggleModeBtn.innerHTML = '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode';
  } else {
    quill.clipboard.dangerouslyPasteHTML(htmlEditor.value);
    htmlEditor.style.display = 'none';
    quillWrap.style.display = '';
    toggleModeBtn.innerHTML = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  }

  redrawIcons();
}

async function saveTemplate(event) {
  event.preventDefault();
  const payload = {
    title: document.getElementById('t-title').value.trim(),
    subject: document.getElementById('t-subject').value.trim(),
    body: htmlMode ? htmlEditor.value : quill.root.innerHTML
  };

  saveTemplateBtn.disabled = true;
  saveTemplateBtn.innerHTML = '<span class="spinner"></span><span>Saving...</span>';

  try {
    if (editingId) {
      const updated = await api.put(`/templates/${editingId}`, payload);
      templates = templates.map(item => item.id === editingId ? updated : item);
      Toast.success('Template updated.');
    } else {
      const created = await api.post('/templates', payload);
      templates.unshift(created);
      Toast.success('Template created.');
    }

    renderTemplateGrid();
    closeTemplateModal();
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to save template.');
  } finally {
    saveTemplateBtn.disabled = false;
    saveTemplateBtn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${editingId ? 'Save Changes' : 'Save Template'}`;
    redrawIcons();
  }
}

async function deleteTemplate(id) {
  const confirmed = await Swal.fire({
    title: 'Delete this template?',
    text: 'This cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: getCssVar('--danger'),
    cancelButtonColor: 'transparent',
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary'),
    customClass: { popup: 'swal-dark' }
  });

  if (!confirmed.isConfirmed) return;

  try {
    await api.del(`/templates/${id}`);
    templates = templates.filter(item => item.id !== id);
    renderTemplateGrid();
    Toast.success('Template deleted.');
  } catch (error) {
    Toast.error(error.response?.data?.detail || error.message || 'Failed to delete template.');
  }
}

function openPreview(id) {
  const template = templates.find(item => item.id === id);
  if (!template) return;

  document.getElementById('preview-content').innerHTML = buildPreviewEmail(template);
  previewModal.classList.remove('hidden');
}

function closePreviewModal() {
  previewModal.classList.add('hidden');
}

/* ─────────────────────────────────────────────
   BUILD PREVIEW EMAIL
   Clean white email · amber/gold brand accents
   Email-client-safe table layout · inline styles only
   Images inside body are capped at 100% width
   ───────────────────────────────────────────── */
function buildPreviewEmail(template) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Replace variables with sample values
  let body = (template.body || '')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g, today);

  // ── Sanitise injected body images ──────────────────────────────────────
  // Any <img> tags inside the template body must not blow out the layout.
  // We cap them to max-width:100% and remove any explicit width/height attrs
  // that override that, then constrain height to auto.
  body = body
    .replace(/<img(\s[^>]*)?>/gi, (match, attrs) => {
      // strip width/height attributes
      let cleaned = (attrs || '')
        .replace(/\s*width\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*height\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
      return `<img${cleaned} style="max-width:100%;height:auto;display:block;margin:0 auto;">`;
    });

  // ── Honeycomb SVG brand mark (inline, always correct size) ────────────
  const honeycombSVG = `
    <svg width="36" height="36" viewBox="0 0 100 115" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <!-- top-left cell -->
      <polygon points="25,5 49,18 49,46 25,59 1,46 1,18" fill="#f5a623" stroke="#111" stroke-width="3"/>
      <polygon points="25,13 41,22 41,40 25,49 9,40 9,22" fill="#ffc547"/>
      <!-- top-right cell -->
      <polygon points="73,5 97,18 97,46 73,59 49,46 49,18" fill="#f5a623" stroke="#111" stroke-width="3"/>
      <polygon points="73,13 89,22 89,40 73,49 57,40 57,22" fill="#ffc547"/>
      <!-- bottom-centre cell -->
      <polygon points="49,60 73,73 73,101 49,114 25,101 25,73" fill="#f5a623" stroke="#111" stroke-width="3"/>
      <polygon points="49,68 65,77 65,95 49,104 33,95 33,77" fill="#ffc547"/>
      <!-- gloss dot top-left cell -->
      <circle cx="20" cy="24" r="4" fill="rgba(255,255,255,0.45)"/>
    </svg>`;

  return `
  <div style="margin:0;padding:0;background-color:#eeeee8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background-color:#eeeee8;padding:28px 0 36px;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 style="max-width:580px;width:100%;border-radius:20px;overflow:hidden;
                        box-shadow:0 8px 40px rgba(0,0,0,0.13);">

            <!-- ════════════════════════════════
                 TOP NAV BAR
                 ════════════════════════════════ -->
            <tr>
              <td style="background-color:#111111;padding:18px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <!-- Logo: inline SVG + wordmark -->
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:10px;">${honeycombSVG}</td>
                          <td style="vertical-align:middle;">
                            <span style="font-size:17px;font-weight:900;color:#f5a623;
                                         letter-spacing:0.1em;text-transform:uppercase;
                                         line-height:1;">DESIGN HIVE</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <!-- Badge -->
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;padding:5px 13px;border-radius:999px;
                                   background-color:#f5a623;color:#111111;font-size:9px;
                                   font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">
                        Admin Dispatch
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ════════════════════════════════
                 HERO BANNER
                 ════════════════════════════════ -->
            <tr>
              <td style="background:linear-gradient(145deg,#1c1c1c 0%,#28200a 60%,#1c1c1c 100%);
                          padding:44px 32px 40px;position:relative;">
                <!-- Overline -->
                <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.26em;
                           text-transform:uppercase;color:#f5a623;">DesignHive AI &nbsp;·&nbsp; Welcome</p>
                <!-- Subject -->
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:900;
                            color:#ffffff;max-width:400px;">${escapeHtml(template.subject)}</h1>
                <!-- Subtitle -->
                <p style="margin:0 0 24px;font-size:13px;line-height:1.75;color:#b8a87a;max-width:380px;">
                  Sent via your DesignHive admin dashboard &mdash; ${today}
                </p>
                <!-- Amber accent rule -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:48px;height:4px;background-color:#f5a623;border-radius:2px;"></td>
                    <td style="width:12px;"></td>
                    <td style="width:16px;height:4px;background-color:#f5a62355;border-radius:2px;"></td>
                    <td style="width:8px;"></td>
                    <td style="width:8px;height:4px;background-color:#f5a62322;border-radius:2px;"></td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ════════════════════════════════
                 MAIN BODY — white background
                 Images inside capped by wrapper
                 ════════════════════════════════ -->
            <tr>
              <td style="background-color:#ffffff;padding:36px 32px 28px;">

                <!-- Body content scoped: all child images and text normalised -->
                <div style="font-size:15px;line-height:1.9;color:#2d2d2d;
                             font-family:'Segoe UI',Tahoma,Arial,sans-serif;
                             max-width:100%;overflow:hidden;">
                  ${body}
                </div>

              </td>
            </tr>

            <!-- ════════════════════════════════
                 CTA BLOCK
                 ════════════════════════════════ -->
            <tr>
              <td style="background-color:#ffffff;padding:0 32px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="border-radius:10px;background-color:#111111;">
                      <a href="/dashboard.html"
                         style="display:inline-block;padding:15px 30px;border-radius:10px;
                                background-color:#111111;color:#f5a623;text-decoration:none;
                                font-weight:800;font-size:14px;letter-spacing:0.06em;
                                text-transform:uppercase;">
                        Open Dashboard &nbsp;&rarr;
                      </a>
                    </td>
                    <td style="width:16px;"></td>
                    <td>
                      <a href="#"
                         style="display:inline-block;padding:14px 24px;border-radius:10px;
                                border:2px solid #e0e0da;color:#555555;text-decoration:none;
                                font-weight:700;font-size:13px;letter-spacing:0.04em;">
                        View Online
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ════════════════════════════════
                 FEATURE TILES (3-up)
                 ════════════════════════════════ -->
            <tr>
              <td style="background-color:#f8f8f4;padding:24px 32px;border-top:1px solid #eeeeea;">
                <p style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:0.2em;
                           text-transform:uppercase;color:#aaaaaa;">What's waiting for you</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <!-- Tile 1 -->
                    <td width="31%" style="vertical-align:top;background-color:#ffffff;
                                           border-radius:12px;border:1px solid #e8e8e3;
                                           padding:16px 14px;text-align:center;">
                      <div style="width:36px;height:36px;border-radius:10px;
                                  background-color:#111111;margin:0 auto 10px;
                                  display:flex;align-items:center;justify-content:center;
                                  font-size:17px;line-height:36px;">📊</div>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#111111;
                                 letter-spacing:0.06em;text-transform:uppercase;">Campaigns</p>
                      <p style="margin:0;font-size:11px;color:#999999;line-height:1.5;">
                        Build &amp; launch targeted outreach
                      </p>
                    </td>
                    <td width="3%"></td>
                    <!-- Tile 2 -->
                    <td width="31%" style="vertical-align:top;background-color:#ffffff;
                                           border-radius:12px;border:1px solid #e8e8e3;
                                           padding:16px 14px;text-align:center;">
                      <div style="width:36px;height:36px;border-radius:10px;
                                  background-color:#f5a623;margin:0 auto 10px;
                                  font-size:17px;line-height:36px;text-align:center;">👤</div>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#111111;
                                 letter-spacing:0.06em;text-transform:uppercase;">Users</p>
                      <p style="margin:0;font-size:11px;color:#999999;line-height:1.5;">
                        Manage your audience &amp; segments
                      </p>
                    </td>
                    <td width="3%"></td>
                    <!-- Tile 3 -->
                    <td width="31%" style="vertical-align:top;background-color:#ffffff;
                                           border-radius:12px;border:1px solid #e8e8e3;
                                           padding:16px 14px;text-align:center;">
                      <div style="width:36px;height:36px;border-radius:10px;
                                  background-color:#111111;margin:0 auto 10px;
                                  font-size:17px;line-height:36px;text-align:center;">📝</div>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#111111;
                                 letter-spacing:0.06em;text-transform:uppercase;">Templates</p>
                      <p style="margin:0;font-size:11px;color:#999999;line-height:1.5;">
                        Design &amp; preview every email
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ════════════════════════════════
                 FOOTER
                 ════════════════════════════════ -->
            <tr>
              <td style="background-color:#111111;border-radius:0 0 20px 20px;padding:26px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="vertical-align:top;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:900;color:#f5a623;
                                 letter-spacing:0.06em;">DesignHive AI</p>
                      <p style="margin:0;font-size:11px;color:#666666;line-height:1.7;">
                        Campaign workflows &nbsp;&middot;&nbsp; Template previews<br>
                        User targeting &nbsp;&middot;&nbsp; Delivery tracking
                      </p>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <p style="margin:0 0 2px;font-size:11px;color:#666666;">support@designhive.ai</p>
                      <p style="margin:0;font-size:11px;color:#666666;">admin.designhive.ai</p>
                    </td>
                  </tr>
                </table>
                <!-- Divider -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                       style="margin-top:18px;">
                  <tr>
                    <td style="height:1px;background:linear-gradient(to right,
                                transparent,rgba(245,166,35,0.3),rgba(245,166,35,0.3),transparent);">
                    </td>
                  </tr>
                </table>
                <!-- Bottom row -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                       style="margin-top:16px;">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:10px;color:#444444;line-height:1.8;">
                        You're receiving this because you signed up for DesignHive AI.<br>
                        &copy; ${new Date().getFullYear()} DesignHive AI &mdash; All rights reserved.
                      </p>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <a href="#" style="display:inline-block;padding:5px 13px;border-radius:999px;
                                          border:1px solid #333333;color:#666666;text-decoration:none;
                                          font-size:9px;font-weight:700;letter-spacing:0.14em;
                                          text-transform:uppercase;">Unsubscribe</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

/* ─────────────────────────────────────────────
   DEFAULT TEMPLATE BODY
   Fully styled, email-safe HTML.
   White bg · amber accents · no images.
   Variables: {{name}} {{email}} {{date}}
   ───────────────────────────────────────────── */
function getDefaultTemplateBody() {
  return `<!-- Greeting -->
<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:0.14em;
           text-transform:uppercase;color:#f5a623;font-family:'Segoe UI',Arial,sans-serif;">
  Welcome aboard
</p>
<p style="margin:0 0 20px;font-size:22px;font-weight:800;color:#111111;line-height:1.25;
           font-family:'Segoe UI',Arial,sans-serif;">
  Hello, {{name}} 👋
</p>

<!-- Intro paragraph -->
<p style="margin:0 0 20px;font-size:15px;color:#444444;line-height:1.85;
           font-family:'Segoe UI',Arial,sans-serif;">
  Your account is live and everything is ready to go. We built DesignHive AI to help you
  move faster, communicate smarter, and scale without friction — and we're genuinely
  excited to see what you create.
</p>

<!-- Account details card -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#fffbf0;border-left:5px solid #f5a623;
                border-radius:0 12px 12px 0;padding:20px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.2em;
                 text-transform:uppercase;color:#f5a623;font-family:'Segoe UI',Arial,sans-serif;">
        Your Account Details
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:12px;font-weight:700;color:#888888;
                      text-transform:uppercase;letter-spacing:0.08em;
                      font-family:'Segoe UI',Arial,sans-serif;">Name</td>
          <td style="padding:3px 0;font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,sans-serif;">{{name}}</td>
        </tr>
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:12px;font-weight:700;color:#888888;
                      text-transform:uppercase;letter-spacing:0.08em;
                      font-family:'Segoe UI',Arial,sans-serif;">Email</td>
          <td style="padding:3px 0;font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,sans-serif;">{{email}}</td>
        </tr>
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:12px;font-weight:700;color:#888888;
                      text-transform:uppercase;letter-spacing:0.08em;
                      font-family:'Segoe UI',Arial,sans-serif;">Date</td>
          <td style="padding:3px 0;font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,sans-serif;">{{date}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Body paragraph -->
<p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.85;
           font-family:'Segoe UI',Arial,sans-serif;">
  From here you can launch campaigns, manage your user list, and design beautiful
  email templates — all from one dashboard. Every tool you need is already set up
  and waiting for you.
</p>

<!-- Next steps card -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="margin:0 0 28px;">
  <tr>
    <td style="background-color:#f7f7f3;border-radius:14px;border:1px solid #e8e8e2;
                padding:22px 24px;">
      <p style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:0.2em;
                 text-transform:uppercase;color:#aaaaaa;font-family:'Segoe UI',Arial,sans-serif;">
        Here's what to do next
      </p>

      <!-- Step 1 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
             style="margin-bottom:12px;">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span style="display:inline-block;width:24px;height:24px;line-height:24px;
                          border-radius:6px;background-color:#111111;color:#f5a623;
                          font-size:11px;font-weight:900;text-align:center;
                          font-family:'Segoe UI',Arial,sans-serif;">1</span>
          </td>
          <td style="vertical-align:top;padding-left:4px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,sans-serif;">Explore your dashboard</p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:'Segoe UI',Arial,sans-serif;">
              Get familiar with the layout, metrics, and navigation.
            </p>
          </td>
        </tr>
      </table>

      <!-- Step 2 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
             style="margin-bottom:12px;">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span style="display:inline-block;width:24px;height:24px;line-height:24px;
                          border-radius:6px;background-color:#f5a623;color:#111111;
                          font-size:11px;font-weight:900;text-align:center;
                          font-family:'Segoe UI',Arial,sans-serif;">2</span>
          </td>
          <td style="vertical-align:top;padding-left:4px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,sans-serif;">Launch your first campaign</p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:'Segoe UI',Arial,sans-serif;">
              Reach your audience in minutes with a polished, targeted send.
            </p>
          </td>
        </tr>
      </table>

      <!-- Step 3 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="32" style="vertical-align:top;padding-top:1px;">
            <span style="display:inline-block;width:24px;height:24px;line-height:24px;
                          border-radius:6px;background-color:#111111;color:#f5a623;
                          font-size:11px;font-weight:900;text-align:center;
                          font-family:'Segoe UI',Arial,sans-serif;">3</span>
          </td>
          <td style="vertical-align:top;padding-left:4px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,sans-serif;">Customise your templates</p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:'Segoe UI',Arial,sans-serif;">
              Make every email feel on-brand with the visual template editor.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Closing -->
<p style="margin:0 0 6px;font-size:15px;color:#444444;line-height:1.85;
           font-family:'Segoe UI',Arial,sans-serif;">
  If you have any questions, just hit reply — we're always around and happy to help.
</p>
<p style="margin:0;font-size:15px;color:#444444;font-family:'Segoe UI',Arial,sans-serif;">
  Looking forward to building something great together.
</p>
<p style="margin:22px 0 0;font-size:15px;font-weight:800;color:#111111;
           font-family:'Segoe UI',Arial,sans-serif;">
  — The Design Hive Team
</p>`;
}

function insertVariable(variable) {
  if (htmlMode) {
    const start = htmlEditor.selectionStart ?? htmlEditor.value.length;
    const end = htmlEditor.selectionEnd ?? htmlEditor.value.length;
    htmlEditor.value = `${htmlEditor.value.slice(0, start)}${variable}${htmlEditor.value.slice(end)}`;
    htmlEditor.focus();
    htmlEditor.setSelectionRange(start + variable.length, start + variable.length);
    return;
  }

  const range = quill.getSelection(true);
  const index = range ? range.index : quill.getLength();
  quill.insertText(index, variable);
  quill.setSelection(index + variable.length);
}

function stripHtml(html) {
  const element = document.createElement('div');
  element.innerHTML = html || '';
  return element.textContent || element.innerText || '';
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
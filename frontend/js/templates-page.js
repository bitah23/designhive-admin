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
   Clean white email with amber/gold brand accents.
   Email-client-safe inline styles only.
   ───────────────────────────────────────────── */
function buildPreviewEmail(template) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const body = (template.body || '')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g, today);

  // Strip any outer wrapper divs from the body since we're wrapping ourselves
  const cleanBody = body.trim();

  return `
  <div style="margin:0;padding:0;background-color:#f4f4f0;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f4f4f0;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">

            <!-- ── TOP BAR ── -->
            <tr>
              <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:20px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <!-- Honeycomb SVG logo mark + wordmark -->
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding-right:10px;vertical-align:middle;">
                            <svg width="32" height="32" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                              <polygon points="40,2 72,20 72,56 40,74 8,56 8,20" fill="#f5a623" stroke="#111" stroke-width="4"/>
                              <polygon points="40,14 62,26 62,50 40,62 18,50 18,26" fill="#ffc547" stroke="#f5a623" stroke-width="2"/>
                            </svg>
                          </td>
                          <td style="vertical-align:middle;">
                            <span style="font-size:18px;font-weight:800;color:#f5a623;letter-spacing:0.08em;text-transform:uppercase;">DESIGN HIVE</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:#f5a623;color:#111111;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">Admin Dispatch</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── HERO BANNER ── -->
            <tr>
              <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2a2008 100%);padding:40px 32px 36px;">
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#f5a623;">DesignHive AI</p>
                <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15;font-weight:800;color:#ffffff;">${escapeHtml(template.subject)}</h1>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#c8b98a;max-width:420px;">Professional email dispatch from your DesignHive admin dashboard.</p>
                <div style="margin-top:20px;display:inline-block;width:40px;height:3px;background-color:#f5a623;border-radius:2px;"></div>
              </td>
            </tr>

            <!-- ── DATE STRIP ── -->
            <tr>
              <td style="background-color:#f5a623;padding:8px 32px;">
                <p style="margin:0;font-size:11px;font-weight:700;color:#111111;letter-spacing:0.12em;text-transform:uppercase;">${today}</p>
              </td>
            </tr>

            <!-- ── MAIN BODY ── -->
            <tr>
              <td style="background-color:#ffffff;padding:40px 32px 32px;">
                <div style="font-size:15px;line-height:1.85;color:#2c2c2c;">
                  ${cleanBody}
                </div>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;">
                  <tr>
                    <td style="border-radius:8px;background-color:#111111;">
                      <a href="/dashboard.html" style="display:inline-block;padding:14px 28px;border-radius:8px;background-color:#111111;color:#f5a623;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.04em;">Open Dashboard &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── DIVIDER ── -->
            <tr>
              <td style="background-color:#ffffff;padding:0 32px;">
                <div style="height:1px;background:linear-gradient(to right,#f5a623,#ffe08a,#f5a623);"></div>
              </td>
            </tr>

            <!-- ── QUICK LINKS ── -->
            <tr>
              <td style="background-color:#ffffff;padding:24px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="33%" style="text-align:center;padding:16px 8px;border-radius:10px;background-color:#fafaf7;border:1px solid #eeeeea;">
                      <p style="margin:0 0 4px;font-size:20px;">📊</p>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#111111;letter-spacing:0.06em;">CAMPAIGNS</p>
                    </td>
                    <td width="4%"></td>
                    <td width="33%" style="text-align:center;padding:16px 8px;border-radius:10px;background-color:#fafaf7;border:1px solid #eeeeea;">
                      <p style="margin:0 0 4px;font-size:20px;">👤</p>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#111111;letter-spacing:0.06em;">USERS</p>
                    </td>
                    <td width="4%"></td>
                    <td width="33%" style="text-align:center;padding:16px 8px;border-radius:10px;background-color:#fafaf7;border:1px solid #eeeeea;">
                      <p style="margin:0 0 4px;font-size:20px;">📝</p>
                      <p style="margin:0;font-size:11px;font-weight:700;color:#111111;letter-spacing:0.06em;">TEMPLATES</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ── FOOTER ── -->
            <tr>
              <td style="background-color:#111111;border-radius:0 0 16px 16px;padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0 0 4px;font-size:13px;font-weight:800;color:#f5a623;">DesignHive AI</p>
                      <p style="margin:0;font-size:12px;color:#888888;line-height:1.6;">Campaign workflows · Template previews · Delivery tracking</p>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <p style="margin:0;font-size:12px;color:#888888;">support@designhive.ai</p>
                      <p style="margin:2px 0 0;font-size:12px;color:#888888;">admin.designhive.ai</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);margin-top:20px;">
                      <!-- actual border-top trick for email: use a nested table -->
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid rgba(255,255,255,0.08);margin-top:16px;padding-top:16px;">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:11px;color:#555555;line-height:1.7;">
                        You're receiving this because you signed up for DesignHive AI.<br>
                        &copy; ${new Date().getFullYear()} DesignHive AI &mdash; All rights reserved.
                      </p>
                    </td>
                    <td align="right">
                      <span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:#1e1e1e;border:1px solid #f5a62330;color:#f5a623;font-size:10px;font-weight:700;letter-spacing:0.1em;">UNSUBSCRIBE</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

/* ─────────────────────────────────────────────
   DEFAULT TEMPLATE BODY
   Clean, white-background, email-client-safe.
   Uses amber/gold accent color (#f5a623) for
   brand consistency. No dark backgrounds in body.
   ───────────────────────────────────────────── */
function getDefaultTemplateBody() {
  return `<p style="font-size:16px;color:#2c2c2c;margin:0 0 12px;">Hello <strong style="color:#111111;">{{name}}</strong>,</p>

<p style="font-size:15px;color:#444444;line-height:1.8;margin:0 0 20px;">
  Welcome to <strong style="color:#111111;">Design Hive</strong> — your journey starts right now. We're thrilled to have you on board and can't wait to see what you build.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
  <tr>
    <td style="border-left:4px solid #f5a623;background-color:#fffbf0;border-radius:0 10px 10px 0;padding:18px 20px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#f5a623;">Your Account Details</p>
      <p style="margin:0 0 4px;font-size:14px;color:#333333;"><span style="font-weight:600;color:#111111;">Name:</span> {{name}}</p>
      <p style="margin:0 0 4px;font-size:14px;color:#333333;"><span style="font-weight:600;color:#111111;">Email:</span> {{email}}</p>
      <p style="margin:0;font-size:14px;color:#333333;"><span style="font-weight:600;color:#111111;">Date:</span> {{date}}</p>
    </td>
  </tr>
</table>

<p style="font-size:15px;color:#444444;line-height:1.8;margin:0 0 20px;">
  You now have full access to our suite of powerful tools — from building smart campaigns to managing users and tracking delivery in real time. Everything you need to move faster and scale effortlessly is right at your fingertips.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px;">
  <tr>
    <td style="background-color:#f9f9f7;border-radius:10px;border:1px solid #eeeeea;padding:20px 24px;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#888888;">Here's what you can do next</p>
      <p style="margin:0 0 8px;font-size:14px;color:#333333;">&#9654;&nbsp; <strong style="color:#111111;">Explore your dashboard</strong> — get familiar with the layout and tools</p>
      <p style="margin:0 0 8px;font-size:14px;color:#333333;">&#9654;&nbsp; <strong style="color:#111111;">Launch your first campaign</strong> — reach your audience in minutes</p>
      <p style="margin:0;font-size:14px;color:#333333;">&#9654;&nbsp; <strong style="color:#111111;">Customize your templates</strong> — make every email feel on-brand</p>
    </td>
  </tr>
</table>

<p style="font-size:15px;color:#444444;line-height:1.8;margin:0 0 8px;">
  If you ever have a question or run into anything at all, just hit reply — our team is always here and happy to help.
</p>

<p style="font-size:15px;color:#444444;margin:0;">
  Looking forward to building something great with you.
</p>

<p style="font-size:15px;font-weight:700;color:#111111;margin:20px 0 0;">
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
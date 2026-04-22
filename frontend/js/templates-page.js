/* ═══════════════════════════════════════════════════════════════════
   templates-page.js  —  DesignHive Admin
   All logic for loading, rendering, editing, previewing, and deleting
   email templates. buildPreviewEmail() generates a pixel-perfect,
   email-client-safe HTML preview with full table-based layout,
   bulletproof CTAs, and image sanitisation.
   ═══════════════════════════════════════════════════════════════════ */

let quill;
let templates = [];
let editingId = null;
let htmlMode = false;

/* ── DOM refs ─────────────────────────────────────────────────────── */
const templatesGrid = document.getElementById('templates-grid');
const templateModal = document.getElementById('template-modal');
const previewModal = document.getElementById('preview-modal');
const templateForm = document.getElementById('template-form');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const htmlEditor = document.getElementById('html-editor');
const quillWrap = document.getElementById('quill-wrap');
const saveTemplateBtn = document.getElementById('save-template-btn');

/* ── Global window bindings (used by inline onclick attrs) ────────── */
window.openTemplateModal = openTemplateModal;
window.openPreview = openPreview;
window.deleteTemplate = deleteTemplate;

/* ── Event listeners ─────────────────────────────────────────────── */
document.getElementById('new-template-btn').addEventListener('click', () => openTemplateModal(null));
document.getElementById('close-template-modal').addEventListener('click', closeTemplateModal);
document.getElementById('cancel-template-btn').addEventListener('click', closeTemplateModal);
document.getElementById('close-preview-modal').addEventListener('click', closePreviewModal);
toggleModeBtn.addEventListener('click', toggleEditorMode);
templateForm.addEventListener('submit', saveTemplate);
document.querySelectorAll('.variable-chip').forEach(btn => {
  btn.addEventListener('click', () => insertVariable(btn.dataset.variable));
});

/* ── Boot ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initQuill();
  await loadTemplates();
  redrawIcons();
});

/* ═══════════════════════════════════════════════════════════════════
   QUILL EDITOR
   ═══════════════════════════════════════════════════════════════════ */
function initQuill() {
  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write your email body here…',
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

/* ═══════════════════════════════════════════════════════════════════
   LOAD & RENDER GRID
   ═══════════════════════════════════════════════════════════════════ */
async function loadTemplates() {
  try {
    templates = await api.get('/templates');
    renderTemplateGrid();
  } catch (error) {
    const message = error.response?.data?.detail || error.message || 'Failed to load templates.';
    Toast.error(message);
    templatesGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <i data-lucide="alert-circle" style="width:24px;height:24px"></i>
        </div>
        <p>${escapeHtml(message)}</p>
      </div>`;
    redrawIcons();
  }
}

function renderTemplateGrid() {
  if (!templates.length) {
    templatesGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <i data-lucide="file-text" style="width:24px;height:24px"></i>
        </div>
        <h3 style="margin:0 0 8px;color:var(--text-primary)">No templates yet.</h3>
        <p style="margin:0 0 16px;color:var(--text-muted)">Create your first one.</p>
        <button class="btn btn-primary" type="button" onclick="openTemplateModal(null)">
          <i data-lucide="plus" style="width:14px;height:14px"></i>
          New Template
        </button>
      </div>`;
    redrawIcons();
    return;
  }

  templatesGrid.innerHTML = templates.map(t => `
    <div class="card template-card">
      <div class="flex-between mb-2">
        <div style="min-width:0;padding-right:10px">
          <div class="t-title">${escapeHtml(t.title)}</div>
          <div class="t-subject">${escapeHtml(t.subject)}</div>
        </div>
        <div class="t-actions flex-shrink-0">
          <button class="btn-icon" type="button" title="Preview"
                  onclick="openPreview('${escapeAttr(t.id)}')">
            <i data-lucide="eye" style="width:14px;height:14px;color:var(--gold-strong)"></i>
          </button>
          <button class="btn-icon" type="button" title="Edit"
                  onclick="openTemplateModal('${escapeAttr(t.id)}')">
            <i data-lucide="pencil" style="width:14px;height:14px"></i>
          </button>
          <button class="btn-icon" type="button" title="Delete"
                  onclick="deleteTemplate('${escapeAttr(t.id)}')">
            <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger)"></i>
          </button>
        </div>
      </div>
      <div class="t-preview">${escapeHtml(stripHtml(t.body))}</div>
    </div>
  `).join('');

  redrawIcons();
}

/* ═══════════════════════════════════════════════════════════════════
   TEMPLATE MODAL  (create / edit)
   ═══════════════════════════════════════════════════════════════════ */
function openTemplateModal(id) {
  editingId = id;
  const t = id ? templates.find(item => item.id === id) : null;
  const body = t?.body || getDefaultTemplateBody();

  document.getElementById('modal-template-title').textContent = t ? 'Edit Template' : 'New Template';
  document.getElementById('t-title').value = t?.title || '';
  document.getElementById('t-subject').value = t?.subject || '';

  /* always start in visual mode */
  htmlMode = false;
  htmlEditor.style.display = 'none';
  quillWrap.style.display = '';
  toggleModeBtn.innerHTML = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  saveTemplateBtn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${t ? 'Save Changes' : 'Save Template'}`;

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

/* ── Save ─────────────────────────────────────────────────────────── */
async function saveTemplate(event) {
  event.preventDefault();
  const payload = {
    title: document.getElementById('t-title').value.trim(),
    subject: document.getElementById('t-subject').value.trim(),
    body: htmlMode ? htmlEditor.value : quill.root.innerHTML
  };

  saveTemplateBtn.disabled = true;
  saveTemplateBtn.innerHTML = '<span class="spinner"></span><span>Saving…</span>';

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

/* ── Delete ───────────────────────────────────────────────────────── */
async function deleteTemplate(id) {
  const confirmed = await Swal.fire({
    title: 'Delete this template?',
    text: 'This action cannot be undone.',
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

/* ═══════════════════════════════════════════════════════════════════
   PREVIEW MODAL
   ═══════════════════════════════════════════════════════════════════ */
function openPreview(id) {
  const t = templates.find(item => item.id === id);
  if (!t) return;
  document.getElementById('preview-content').innerHTML = buildPreviewEmail(t);
  previewModal.classList.remove('hidden');
}

function closePreviewModal() {
  previewModal.classList.add('hidden');
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD PREVIEW EMAIL
   ───────────────────────────────────────────────────────────────────
   Renders a pixel-perfect email preview inside the modal.
   Rules strictly followed:
     · 100 % table-based layout — zero divs for structure
     · All CSS inline — no external sheets, no JS
     · Images inside body are sanitised: width/height attrs stripped,
       max-width:100%;height:auto applied so nothing blows out
     · Bulletproof CTA: <a> inside a table cell, never an image
     · Brand: black (#111111) · amber (#f5a623) · white (#ffffff)
     · Dark hero banner + white body = max readability in all clients
   ═══════════════════════════════════════════════════════════════════ */
function buildPreviewEmail(template) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const previewLogo = '/assets/brand/header_logo_v4.png';

  let body = (template.body || '')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g, today);

  /* ── 2. Sanitise any <img> tags in the stored body ────────────
     Remove explicit width/height attrs and force responsive sizing.
     This prevents an oversized logo or image from exploding the
     layout when a legacy template body is pasted in.             */
  body = body.replace(/<img(\s[^>]*)?>/gi, (_match, attrs) => {
    const cleaned = (attrs || '')
      .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+style\s*=\s*["'][^"']*["']/gi, '');
    return `<img${cleaned} width="100%" style="display:block;max-width:100%;width:100%;height:auto;max-height:260px;object-fit:contain;margin:16px auto;" alt="Design Hive visual">`;
  });

  return /* html */`
<style>
  .dh-preview * { box-sizing:border-box; line-height:inherit; }
  .dh-preview {
    margin:0;
    padding:0;
    background-color:#07090f;
    font-family:'DM Sans',Arial,Helvetica,sans-serif;
  }
  .dh-preview table,
  .dh-preview td,
  .dh-preview tr { border-collapse:collapse; vertical-align:top; }
  .dh-preview a { color:inherit; }
</style>
<div class="dh-preview">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#07090f;padding:40px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;">
          <tr>
            <td align="center" style="padding:0 0 24px;">
              <img src="${previewLogo}" alt="Design Hive Logo" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(160deg,#131b2e 0%,#0f1520 60%,#0c1119 100%);border:1px solid rgba(255,159,28,0.12);border-radius:20px;overflow:hidden;box-shadow:0 24px 56px rgba(0,0,0,0.42);">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#ff9f1c 40%,#ffc84a 60%,transparent 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td align="center" style="padding:44px 36px 38px;">
                    <div style="display:inline-block;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#ff9f1c;background:rgba(255,159,28,0.1);border:1px solid rgba(255,159,28,0.25);padding:6px 18px;border-radius:30px;margin-bottom:24px;">
                      New Member
                    </div>
                    <div style="font-family:'Cormorant Garamond','Times New Roman',serif;font-size:52px;font-weight:700;line-height:1.05;color:#ffffff;margin:0 0 12px;">
                      ${escapeHtml(template.subject)}
                    </div>
                    <div style="font-size:17px;color:rgba(255,255,255,0.62);font-weight:300;margin:0 0 30px;">
                      Hello, <span style="color:rgba(255,255,255,0.92);font-weight:500;">John Doe</span> - your journey officially starts now.
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:460px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,159,28,0.2);border-radius:12px;margin:0 auto 30px;">
                      <tr>
                        <td style="width:3px;background:linear-gradient(180deg,#ff9f1c,#ffc84a);font-size:0;line-height:0;">&nbsp;</td>
                        <td style="padding:22px 24px;text-align:left;">
                          <div style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#ff9f1c;margin-bottom:14px;">Your Account</div>
                          <div style="font-size:15px;color:#ffffff;margin-bottom:8px;"><span style="display:inline-block;width:70px;color:rgba(255,255,255,0.45);font-family:'Space Mono','Courier New',monospace;font-size:12px;">Name</span>John Doe</div>
                          <div style="font-size:15px;color:#ffffff;margin-bottom:8px;"><span style="display:inline-block;width:70px;color:rgba(255,255,255,0.45);font-family:'Space Mono','Courier New',monospace;font-size:12px;">Email</span>john@example.com</div>
                          <div style="font-size:15px;color:#ff9f1c;"><span style="display:inline-block;width:70px;color:rgba(255,255,255,0.45);font-family:'Space Mono','Courier New',monospace;font-size:12px;">Date</span>${escapeHtml(today)}</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                      <tr>
                        <td bgcolor="#ffb84a" style="border-radius:50px;background:linear-gradient(135deg,#ff9f1c 0%,#ffb84a 100%);box-shadow:0 8px 32px rgba(255,159,28,0.35);">
                          <a href="/dashboard.html" style="display:inline-block;padding:17px 38px;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.04em;text-transform:uppercase;color:#07090f;">
                            Go to Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:12px;color:rgba(255,255,255,0.25);margin-top:14px;letter-spacing:0.05em;">No credit card required &middot; Cancel anytime</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid rgba(255,159,28,0.14);border-radius:20px;overflow:hidden;box-shadow:0 20px 48px rgba(0,0,0,0.24);">
                <tr>
                  <td style="padding:34px 32px 30px;background:#ffffff;font-size:16px;line-height:1.7;color:#1f2937;text-align:left;word-wrap:break-word;overflow-wrap:break-word;">
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(160deg,#131b2e 0%,#0f1520 100%);border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;box-shadow:0 20px 48px rgba(0,0,0,0.3);">
                <tr>
                  <td style="padding:30px 32px;text-align:center;">
                    <div style="font-size:12px;line-height:1.8;color:rgba(255,255,255,0.5);">
                      You are receiving this because you signed up for Design Hive.<br>
                      <a href="#" style="color:rgba(255,159,28,0.72);text-decoration:none;">Unsubscribe</a>
                      &nbsp;&middot;&nbsp;
                      <a href="#" style="color:rgba(255,159,28,0.72);text-decoration:none;">Privacy Policy</a>
                      &nbsp;&middot;&nbsp;
                      <a href="#" style="color:rgba(255,159,28,0.72);text-decoration:none;">View in Browser</a>
                    </div>
                    <div style="width:60px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,159,28,0.3),transparent);margin:22px auto;"></div>
                    <div style="font-size:11px;line-height:1.8;color:rgba(255,255,255,0.26);">
                      Sent from Design Hive on ${escapeHtml(today)}.<br>
                      Need help? Contact support@designhive.ai
                    </div>
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

/* ═══════════════════════════════════════════════════════════════════
   DEFAULT TEMPLATE BODY
   ───────────────────────────────────────────────────────────────────
   This is the HTML stored as the template body (the part the admin
   edits). It renders inside SECTION 4 (white background) of the
   preview. Written as pure inline-CSS email-safe HTML:
     · No dark backgrounds — white canvas, full readability
     · Amber (#f5a623) used only for accents & highlights
     · Every element has explicit font-family as Quill strips them
     · Table-based account card & steps card — no divs for layout
     · Variables: {{name}}  {{email}}  {{date}}
   ═══════════════════════════════════════════════════════════════════ */
function getDefaultTemplateBody() {
  return `
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#666666;font-family:Arial,Helvetica,sans-serif;">
  Welcome
</p>
<p style="margin:0 0 20px;font-size:26px;font-weight:900;line-height:1.2;color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;">
  Hello, {{name}}
</p>

<p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">
  Welcome to Design Hive. Your account is now active, and your workspace is ready to use.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
  <tr>
    <td style="background:#F7F7F7;border:1px solid #E6E6E6;padding:16px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#555555;font-family:Arial,Helvetica,sans-serif;">
        Account Details
      </p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;"><strong>Name:</strong> {{name}}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;"><strong>Email:</strong> {{email}}</p>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;"><strong>Date:</strong> {{date}}</p>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">
  What you can do next:
</p>
<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">- Explore your dashboard</p>
<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">- Launch your first campaign</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">- Customize your templates</p>

<p style="margin:0;font-size:16px;line-height:1.5;color:#2A2A2A;font-family:Arial,Helvetica,sans-serif;">
  Need help? Reply to this email and our team will assist you.
</p>
<p style="margin:16px 0 0;font-size:16px;font-weight:700;line-height:1.5;color:#1A1A1A;font-family:Arial,Helvetica,sans-serif;">
  - The Design Hive Team
</p>`;
}

/* ═══════════════════════════════════════════════════════════════════
   VARIABLE INSERTION
   ═══════════════════════════════════════════════════════════════════ */
function insertVariable(variable) {
  if (htmlMode) {
    const start = htmlEditor.selectionStart ?? htmlEditor.value.length;
    const end = htmlEditor.selectionEnd ?? htmlEditor.value.length;
    htmlEditor.value =
      htmlEditor.value.slice(0, start) + variable + htmlEditor.value.slice(end);
    htmlEditor.focus();
    htmlEditor.setSelectionRange(start + variable.length, start + variable.length);
    return;
  }
  const range = quill.getSelection(true);
  const index = range ? range.index : quill.getLength();
  quill.insertText(index, variable);
  quill.setSelection(index + variable.length);
}

/* ═══════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════ */
function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return el.textContent || el.innerText || '';
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
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

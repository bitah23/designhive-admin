/* ═══════════════════════════════════════════════════════════════════
   templates-page.js  —  DesignHive Admin
   All logic for loading, rendering, editing, previewing, and deleting
   email templates. buildPreviewEmail() generates a pixel-perfect,
   email-client-safe HTML preview with full table-based layout,
   bulletproof CTAs, and image sanitisation.
   ═══════════════════════════════════════════════════════════════════ */

let quill;
let templates  = [];
let editingId  = null;
let htmlMode   = false;

/* ── DOM refs ─────────────────────────────────────────────────────── */
const templatesGrid   = document.getElementById('templates-grid');
const templateModal   = document.getElementById('template-modal');
const previewModal    = document.getElementById('preview-modal');
const templateForm    = document.getElementById('template-form');
const toggleModeBtn   = document.getElementById('toggle-mode-btn');
const htmlEditor      = document.getElementById('html-editor');
const quillWrap       = document.getElementById('quill-wrap');
const saveTemplateBtn = document.getElementById('save-template-btn');

/* ── Global window bindings (used by inline onclick attrs) ────────── */
window.openTemplateModal = openTemplateModal;
window.openPreview       = openPreview;
window.deleteTemplate    = deleteTemplate;

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
  const t    = id ? templates.find(item => item.id === id) : null;
  const body = t?.body || getDefaultTemplateBody();

  document.getElementById('modal-template-title').textContent = t ? 'Edit Template' : 'New Template';
  document.getElementById('t-title').value   = t?.title   || '';
  document.getElementById('t-subject').value = t?.subject || '';

  /* always start in visual mode */
  htmlMode = false;
  htmlEditor.style.display  = 'none';
  quillWrap.style.display   = '';
  toggleModeBtn.innerHTML   = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
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
    htmlEditor.value          = quill.root.innerHTML;
    quillWrap.style.display   = 'none';
    htmlEditor.style.display  = '';
    toggleModeBtn.innerHTML   = '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode';
  } else {
    quill.clipboard.dangerouslyPasteHTML(htmlEditor.value);
    htmlEditor.style.display  = 'none';
    quillWrap.style.display   = '';
    toggleModeBtn.innerHTML   = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  }
  redrawIcons();
}

/* ── Save ─────────────────────────────────────────────────────────── */
async function saveTemplate(event) {
  event.preventDefault();
  const payload = {
    title:   document.getElementById('t-title').value.trim(),
    subject: document.getElementById('t-subject').value.trim(),
    body:    htmlMode ? htmlEditor.value : quill.root.innerHTML
  };

  saveTemplateBtn.disabled  = true;
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
    saveTemplateBtn.disabled  = false;
    saveTemplateBtn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${editingId ? 'Save Changes' : 'Save Template'}`;
    redrawIcons();
  }
}

/* ── Delete ───────────────────────────────────────────────────────── */
async function deleteTemplate(id) {
  const confirmed = await Swal.fire({
    title: 'Delete this template?',
    text:  'This action cannot be undone.',
    icon:  'warning',
    showCancelButton:  true,
    confirmButtonText: 'Delete',
    confirmButtonColor: getCssVar('--danger'),
    cancelButtonColor:  'transparent',
    background: getCssVar('--bg-card'),
    color:      getCssVar('--text-primary'),
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
  /* ── 1. Sample data substitution ─────────────────────────────── */
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  let body = (template.body || '')
    .replace(/\{\{name\}\}/g,  'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g,  today);

  /* ── 2. Sanitise any <img> tags in the stored body ────────────
     Remove explicit width/height attrs and force responsive sizing.
     This prevents an oversized logo or image from exploding the
     layout when a legacy template body is pasted in.             */
  body = body.replace(/<img(\s[^>]*)?>/gi, (_match, attrs) => {
    const cleaned = (attrs || '')
      .replace(/\s+width\s*=\s*["'][^"']*["']/gi,  '')
      .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+style\s*=\s*["'][^"']*["']/gi,  '');
    return `<img${cleaned} width="100%" style="max-width:100%;height:auto;display:block;margin:0 auto;" alt="">`;
  });

  /* ── 3. Inline SVG honeycomb logo (correct size, always works) ─ */
  const svgLogo = /* html */`
    <svg width="38" height="38" viewBox="0 0 110 126"
         xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <!-- top-left hex -->
      <polygon points="28,4 54,19 54,49 28,64 2,49 2,19"
               fill="#f5a623" stroke="#0d0d0d" stroke-width="3"/>
      <polygon points="28,13 46,23 46,43 28,53 10,43 10,23"
               fill="#ffc547"/>
      <circle cx="22" cy="25" r="4.5" fill="rgba(255,255,255,.5)"/>
      <!-- top-right hex -->
      <polygon points="82,4 108,19 108,49 82,64 56,49 56,19"
               fill="#f5a623" stroke="#0d0d0d" stroke-width="3"/>
      <polygon points="82,13 100,23 100,43 82,53 64,43 64,23"
               fill="#ffc547"/>
      <!-- bottom-centre hex -->
      <polygon points="55,67 81,82 81,112 55,127 29,112 29,82"
               fill="#f5a623" stroke="#0d0d0d" stroke-width="3"/>
      <polygon points="55,76 73,86 73,106 55,116 37,106 37,86"
               fill="#ffc547"/>
    </svg>`;

  /* ── 4. Build the full email wrapper ────────────────────────── */
  return /* html */`
<div style="margin:0;padding:0;background-color:#e8e4d8;
            font-family:'Segoe UI',Tahoma,Arial,Helvetica,sans-serif;">

  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         width="100%" style="background-color:#e8e4d8;">
  <tr><td align="center"><![endif]-->

  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
         width="100%"
         style="background-color:#e8e4d8;padding:32px 12px 40px;">
    <tr>
      <td align="center">

        <!-- ╔══════════════════════════════════════════╗
             ║  OUTER CARD  max-width 600px             ║
             ╚══════════════════════════════════════════╝ -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;
                      border-radius:20px;overflow:hidden;
                      box-shadow:0 12px 48px rgba(0,0,0,0.18);
                      mso-table-lspace:0pt;mso-table-rspace:0pt;">

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 1 — TOP BAR / NAVIGATION    │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#0d0d0d;padding:16px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0" width="100%"
                     style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Logo mark + wordmark -->
                  <td style="vertical-align:middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0"
                           border="0"
                           style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;
                                    line-height:0;">${svgLogo}</td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:16px;font-weight:900;
                                       color:#f5a623;letter-spacing:0.12em;
                                       text-transform:uppercase;
                                       font-family:Arial,Helvetica,sans-serif;">
                            DESIGN HIVE
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Admin badge -->
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;padding:5px 14px;
                                 border-radius:999px;background-color:#f5a623;
                                 color:#0d0d0d;font-size:9px;font-weight:900;
                                 letter-spacing:0.22em;text-transform:uppercase;
                                 font-family:Arial,Helvetica,sans-serif;">
                      Admin Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 2 — HERO BANNER             │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background:linear-gradient(150deg,#161616 0%,#231d06 55%,#161616 100%);
                        padding:48px 32px 42px;">
              <!-- Overline label -->
              <p style="margin:0 0 14px;
                         font-size:10px;font-weight:800;
                         letter-spacing:0.28em;text-transform:uppercase;
                         color:#f5a623;
                         font-family:Arial,Helvetica,sans-serif;">
                DesignHive AI &nbsp;·&nbsp; Welcome
              </p>
              <!-- Subject / headline -->
              <h1 style="margin:0 0 18px;
                          font-size:30px;line-height:1.18;font-weight:900;
                          color:#ffffff;max-width:420px;
                          font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
                ${escapeHtml(template.subject)}
              </h1>
              <!-- Dispatch meta line -->
              <p style="margin:0 0 28px;
                         font-size:13px;line-height:1.7;
                         color:#b0a070;max-width:390px;
                         font-family:Arial,Helvetica,sans-serif;">
                Sent via your DesignHive admin dashboard &mdash; ${today}
              </p>
              <!-- Decorative amber rule -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0"
                     style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td style="width:52px;height:4px;background-color:#f5a623;
                              border-radius:3px;"></td>
                  <td style="width:14px;"></td>
                  <td style="width:20px;height:4px;
                              background-color:rgba(245,166,35,0.4);
                              border-radius:3px;"></td>
                  <td style="width:10px;"></td>
                  <td style="width:10px;height:4px;
                              background-color:rgba(245,166,35,0.18);
                              border-radius:3px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 3 — AMBER DATE STRIP        │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#f5a623;padding:9px 32px;">
              <p style="margin:0;font-size:10px;font-weight:900;
                         color:#0d0d0d;letter-spacing:0.18em;
                         text-transform:uppercase;
                         font-family:Arial,Helvetica,sans-serif;">
                ${today}
              </p>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 4 — MAIN BODY (white)       │
               │  All user content goes here.         │
               │  Images are sanitised above so they  │
               │  cannot blow out the column width.   │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 32px 32px;">
              <div style="font-size:15px;line-height:1.9;color:#2a2a2a;
                           font-family:'Segoe UI',Arial,Helvetica,sans-serif;
                           max-width:100%;word-wrap:break-word;
                           overflow-wrap:break-word;">
                ${body}
              </div>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 5 — BULLETPROOF CTA BLOCK  │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#ffffff;
                        padding:0 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0"
                     style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Primary CTA: black bg, amber text -->
                  <td style="border-radius:10px;background-color:#111111;">
                    <a href="/dashboard.html"
                       style="display:inline-block;
                              min-height:48px;line-height:48px;
                              padding:0 32px;
                              border-radius:10px;
                              background-color:#111111;
                              color:#f5a623;
                              text-decoration:none;
                              font-weight:800;font-size:13px;
                              letter-spacing:0.08em;
                              text-transform:uppercase;
                              white-space:nowrap;
                              font-family:Arial,Helvetica,sans-serif;">
                      Open Dashboard &nbsp;&rarr;
                    </a>
                  </td>
                  <td style="width:14px;"></td>
                  <!-- Secondary CTA: outlined -->
                  <td>
                    <a href="#"
                       style="display:inline-block;
                              min-height:46px;line-height:44px;
                              padding:0 24px;
                              border-radius:10px;
                              border:2px solid #d8d4c8;
                              background-color:#ffffff;
                              color:#666666;
                              text-decoration:none;
                              font-weight:700;font-size:13px;
                              letter-spacing:0.04em;
                              white-space:nowrap;
                              font-family:Arial,Helvetica,sans-serif;">
                      View Online
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 6 — FEATURE TILES (3-up)   │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#f7f6f0;
                        padding:26px 32px 30px;
                        border-top:1px solid #e8e4d8;">
              <p style="margin:0 0 16px;font-size:9px;font-weight:900;
                          letter-spacing:0.24em;text-transform:uppercase;
                          color:#aaaaaa;
                          font-family:Arial,Helvetica,sans-serif;">
                What's waiting for you
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0" width="100%"
                     style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <!-- Tile: Campaigns -->
                  <td width="31%" valign="top"
                      style="background-color:#ffffff;border-radius:12px;
                              border:1px solid #e4e0d4;padding:18px 12px;
                              text-align:center;">
                    <div style="width:40px;height:40px;margin:0 auto 10px;
                                 border-radius:10px;background-color:#111111;
                                 font-size:18px;line-height:40px;
                                 text-align:center;">
                      📊
                    </div>
                    <p style="margin:0 0 5px;font-size:11px;font-weight:800;
                                color:#111111;letter-spacing:0.06em;
                                text-transform:uppercase;
                                font-family:Arial,Helvetica,sans-serif;">
                      Campaigns
                    </p>
                    <p style="margin:0;font-size:11px;color:#999999;
                                line-height:1.55;
                                font-family:Arial,Helvetica,sans-serif;">
                      Build &amp; launch targeted outreach
                    </p>
                  </td>
                  <td width="3%"></td>
                  <!-- Tile: Users -->
                  <td width="31%" valign="top"
                      style="background-color:#ffffff;border-radius:12px;
                              border:1px solid #e4e0d4;padding:18px 12px;
                              text-align:center;">
                    <div style="width:40px;height:40px;margin:0 auto 10px;
                                 border-radius:10px;background-color:#f5a623;
                                 font-size:18px;line-height:40px;
                                 text-align:center;">
                      👤
                    </div>
                    <p style="margin:0 0 5px;font-size:11px;font-weight:800;
                                color:#111111;letter-spacing:0.06em;
                                text-transform:uppercase;
                                font-family:Arial,Helvetica,sans-serif;">
                      Users
                    </p>
                    <p style="margin:0;font-size:11px;color:#999999;
                                line-height:1.55;
                                font-family:Arial,Helvetica,sans-serif;">
                      Manage audience &amp; segments
                    </p>
                  </td>
                  <td width="3%"></td>
                  <!-- Tile: Templates -->
                  <td width="31%" valign="top"
                      style="background-color:#ffffff;border-radius:12px;
                              border:1px solid #e4e0d4;padding:18px 12px;
                              text-align:center;">
                    <div style="width:40px;height:40px;margin:0 auto 10px;
                                 border-radius:10px;background-color:#111111;
                                 font-size:18px;line-height:40px;
                                 text-align:center;">
                      📝
                    </div>
                    <p style="margin:0 0 5px;font-size:11px;font-weight:800;
                                color:#111111;letter-spacing:0.06em;
                                text-transform:uppercase;
                                font-family:Arial,Helvetica,sans-serif;">
                      Templates
                    </p>
                    <p style="margin:0;font-size:11px;color:#999999;
                                line-height:1.55;
                                font-family:Arial,Helvetica,sans-serif;">
                      Design &amp; preview every email
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ┌──────────────────────────────────────┐
               │  SECTION 7 — FOOTER                  │
               └──────────────────────────────────────┘ -->
          <tr>
            <td style="background-color:#0d0d0d;
                        border-radius:0 0 20px 20px;
                        padding:28px 32px 26px;">
              <!-- Brand + contact row -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0" width="100%"
                     style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:900;
                                color:#f5a623;letter-spacing:0.07em;
                                font-family:Arial,Helvetica,sans-serif;">
                      DesignHive AI
                    </p>
                    <p style="margin:0;font-size:11px;color:#5a5a5a;
                                line-height:1.75;
                                font-family:Arial,Helvetica,sans-serif;">
                      Campaign workflows &middot; Template previews<br>
                      User targeting &middot; Delivery tracking
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <p style="margin:0 0 3px;font-size:11px;color:#5a5a5a;
                                font-family:Arial,Helvetica,sans-serif;">
                      support@designhive.ai
                    </p>
                    <p style="margin:0;font-size:11px;color:#5a5a5a;
                                font-family:Arial,Helvetica,sans-serif;">
                      admin.designhive.ai
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Amber gradient divider -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0" width="100%" style="margin-top:20px;">
                <tr>
                  <td style="height:1px;
                              background:linear-gradient(to right,
                                transparent 0%,
                                rgba(245,166,35,0.35) 30%,
                                rgba(245,166,35,0.35) 70%,
                                transparent 100%);"></td>
                </tr>
              </table>

              <!-- Copyright + unsubscribe row -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                     border="0" width="100%" style="margin-top:18px;">
                <tr>
                  <td valign="middle">
                    <p style="margin:0;font-size:10px;color:#3d3d3d;
                                line-height:1.8;
                                font-family:Arial,Helvetica,sans-serif;">
                      You're receiving this because you signed up for DesignHive AI.<br>
                      &copy; ${new Date().getFullYear()} DesignHive AI — All rights reserved.
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <a href="#"
                       style="display:inline-block;padding:5px 14px;
                              border-radius:999px;
                              border:1px solid #2e2e2e;
                              color:#5a5a5a;text-decoration:none;
                              font-size:9px;font-weight:700;
                              letter-spacing:0.16em;text-transform:uppercase;
                              font-family:Arial,Helvetica,sans-serif;">
                      Unsubscribe
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /OUTER CARD -->

      </td>
    </tr>
  </table>

  <!--[if mso]></td></tr></table><![endif]-->

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
<!-- ── GREETING ───────────────────────────────────────────────── -->
<p style="margin:0 0 6px;
           font-size:11px;font-weight:800;letter-spacing:0.22em;
           text-transform:uppercase;color:#f5a623;
           font-family:Arial,Helvetica,sans-serif;">
  Welcome aboard
</p>
<p style="margin:0 0 22px;
           font-size:24px;font-weight:800;line-height:1.2;color:#111111;
           font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  Hello, {{name}} 👋
</p>

<!-- ── INTRO ──────────────────────────────────────────────────── -->
<p style="margin:0 0 22px;
           font-size:15px;line-height:1.85;color:#444444;
           font-family:Arial,Helvetica,sans-serif;">
  Your account is live and everything is ready to go. We built
  <strong style="color:#111111;">DesignHive AI</strong> to help you move faster,
  communicate smarter, and scale without friction — and we're genuinely
  excited to see what you create.
</p>

<!-- ── ACCOUNT DETAILS CARD ───────────────────────────────────── -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
       width="100%"
       style="margin:0 0 26px;
              mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td style="background-color:#fffbf0;
                border-left:5px solid #f5a623;
                border-radius:0 14px 14px 0;
                padding:20px 24px;">
      <p style="margin:0 0 12px;
                 font-size:9px;font-weight:900;letter-spacing:0.24em;
                 text-transform:uppercase;color:#f5a623;
                 font-family:Arial,Helvetica,sans-serif;">
        Your Account Details
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td style="padding:4px 20px 4px 0;
                      font-size:11px;font-weight:700;color:#999999;
                      text-transform:uppercase;letter-spacing:0.1em;
                      font-family:Arial,Helvetica,sans-serif;">
            Name
          </td>
          <td style="padding:4px 0;
                      font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
            {{name}}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 20px 4px 0;
                      font-size:11px;font-weight:700;color:#999999;
                      text-transform:uppercase;letter-spacing:0.1em;
                      font-family:Arial,Helvetica,sans-serif;">
            Email
          </td>
          <td style="padding:4px 0;
                      font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
            {{email}}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 20px 4px 0;
                      font-size:11px;font-weight:700;color:#999999;
                      text-transform:uppercase;letter-spacing:0.1em;
                      font-family:Arial,Helvetica,sans-serif;">
            Date
          </td>
          <td style="padding:4px 0;
                      font-size:14px;font-weight:600;color:#111111;
                      font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
            {{date}}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ── BODY PARAGRAPH ─────────────────────────────────────────── -->
<p style="margin:0 0 26px;
           font-size:15px;line-height:1.85;color:#444444;
           font-family:Arial,Helvetica,sans-serif;">
  From here you can launch campaigns, manage your entire user list,
  and design beautiful email templates — all from one dashboard.
  Every tool you need is already set up and waiting for you.
</p>

<!-- ── NEXT STEPS CARD ────────────────────────────────────────── -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
       width="100%"
       style="margin:0 0 28px;
              mso-table-lspace:0pt;mso-table-rspace:0pt;">
  <tr>
    <td style="background-color:#f7f7f3;
                border-radius:14px;border:1px solid #e6e6e0;
                padding:24px 26px;">
      <p style="margin:0 0 16px;
                 font-size:9px;font-weight:900;letter-spacing:0.24em;
                 text-transform:uppercase;color:#aaaaaa;
                 font-family:Arial,Helvetica,sans-serif;">
        Here's what to do next
      </p>

      <!-- Step 1 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             width="100%"
             style="margin-bottom:14px;
                    mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td width="34" valign="top" style="padding-top:1px;">
            <span style="display:inline-block;
                          width:26px;height:26px;line-height:26px;
                          border-radius:7px;background-color:#111111;
                          color:#f5a623;font-size:11px;font-weight:900;
                          text-align:center;
                          font-family:Arial,Helvetica,sans-serif;">
              1
            </span>
          </td>
          <td valign="top" style="padding-left:4px;">
            <p style="margin:0 0 3px;
                       font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              Explore your dashboard
            </p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:Arial,Helvetica,sans-serif;">
              Get familiar with the layout, metrics, and navigation.
            </p>
          </td>
        </tr>
      </table>

      <!-- Step 2 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             width="100%"
             style="margin-bottom:14px;
                    mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td width="34" valign="top" style="padding-top:1px;">
            <span style="display:inline-block;
                          width:26px;height:26px;line-height:26px;
                          border-radius:7px;background-color:#f5a623;
                          color:#111111;font-size:11px;font-weight:900;
                          text-align:center;
                          font-family:Arial,Helvetica,sans-serif;">
              2
            </span>
          </td>
          <td valign="top" style="padding-left:4px;">
            <p style="margin:0 0 3px;
                       font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              Launch your first campaign
            </p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:Arial,Helvetica,sans-serif;">
              Reach your audience in minutes with a polished, targeted send.
            </p>
          </td>
        </tr>
      </table>

      <!-- Step 3 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"
             width="100%"
             style="mso-table-lspace:0pt;mso-table-rspace:0pt;">
        <tr>
          <td width="34" valign="top" style="padding-top:1px;">
            <span style="display:inline-block;
                          width:26px;height:26px;line-height:26px;
                          border-radius:7px;background-color:#111111;
                          color:#f5a623;font-size:11px;font-weight:900;
                          text-align:center;
                          font-family:Arial,Helvetica,sans-serif;">
              3
            </span>
          </td>
          <td valign="top" style="padding-left:4px;">
            <p style="margin:0 0 3px;
                       font-size:14px;font-weight:700;color:#111111;
                       font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
              Customise your templates
            </p>
            <p style="margin:0;font-size:13px;color:#777777;line-height:1.6;
                       font-family:Arial,Helvetica,sans-serif;">
              Make every email feel on-brand using the visual editor.
            </p>
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

<!-- ── CLOSING ────────────────────────────────────────────────── -->
<p style="margin:0 0 6px;
           font-size:15px;line-height:1.85;color:#444444;
           font-family:Arial,Helvetica,sans-serif;">
  If you have any questions at all, just hit reply — we're always
  around and happy to help.
</p>
<p style="margin:0;
           font-size:15px;color:#444444;
           font-family:Arial,Helvetica,sans-serif;">
  Looking forward to building something great together.
</p>
<p style="margin:24px 0 0;
           font-size:15px;font-weight:800;color:#111111;
           font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  — The Design Hive Team
</p>`;
}

/* ═══════════════════════════════════════════════════════════════════
   VARIABLE INSERTION
   ═══════════════════════════════════════════════════════════════════ */
function insertVariable(variable) {
  if (htmlMode) {
    const start = htmlEditor.selectionStart ?? htmlEditor.value.length;
    const end   = htmlEditor.selectionEnd   ?? htmlEditor.value.length;
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
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function redrawIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

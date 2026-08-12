/* ═══════════════════════════════════════════════════════════════════
   templates-page.js  —  DesignHive Admin
   All logic for loading, rendering, editing, previewing, and deleting
   email templates. buildPreviewEmail() generates a pixel-perfect,
   email-client-safe HTML preview with full table-based layout,
   bulletproof CTAs, and image sanitisation.
   ═══════════════════════════════════════════════════════════════════ */

let quill;
let quillAvailable = false;
let templates = [];
let editingId = null;
let htmlMode = false;
let visualPreview = false;
let defaultTemplateBody = '';
let defaultTemplateBodyPromise = null;

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
window.toggleAiPanel = toggleAiPanel;
window.closeAiPanel = closeAiPanel;
window.generateWithAI = generateWithAI;
window.toggleAiCtaInput = toggleAiCtaInput;
window.approveTemplate = approveTemplate;
window.uploadEmailImage = uploadEmailImage;
window.uploadEmailVideo = uploadEmailVideo;
window.deleteSelectedImage = deleteSelectedImage;
window.showAddCtaLink = showAddCtaLink;
window.hideAddCtaLink = hideAddCtaLink;
window.saveNewCtaLink = saveNewCtaLink;
window.uploadEditImage = uploadEditImage;
window.uploadEditVideo = uploadEditVideo;
window.showAddEditCtaLink = showAddEditCtaLink;
window.hideAddEditCtaLink = hideAddEditCtaLink;
window.saveNewEditCtaLink = saveNewEditCtaLink;

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
  await Promise.all([ensureDefaultTemplateBody(), loadTemplates(), loadUploadLimits()]);
  redrawIcons();

  // The command palette links here with ?new=1 to open the editor directly.
  if (new URLSearchParams(window.location.search).get('new') === '1') {
    openTemplateModal(null);
  }
});

/* ═══════════════════════════════════════════════════════════════════
   QUILL EDITOR
   ═══════════════════════════════════════════════════════════════════ */
/**
 * Boot the rich-text editor.
 *
 * Quill is loaded from a CDN, so it can be missing when that CDN is slow,
 * blocked, or down. Rather than let the whole page die on boot, fall back to
 * the raw HTML editor — every template stays viewable and editable.
 */
function initQuill() {
  if (typeof Quill === 'undefined') {
    quillAvailable = false;
    htmlMode = true;
    console.warn('[templates] Quill failed to load — falling back to HTML mode.');
    return;
  }

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
  quillAvailable = true;
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

function renderTemplateCount() {
  const label = document.getElementById('template-count');
  if (!label) return;
  const drafts = templates.filter(t => t.status === 'draft').length;
  const total = `${templates.length} template${templates.length === 1 ? '' : 's'}`;
  label.textContent = drafts ? `${total} · ${drafts} awaiting approval` : total;
}

function renderTemplateGrid() {
  renderTemplateCount();

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

  templatesGrid.innerHTML = templates.map(t => {
    const isDraft = t.status === 'draft';
    const draftBadge = isDraft
      ? `<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
                      padding:2px 8px;border-radius:20px;
                      background:rgba(255,159,28,0.15);color:var(--gold);border:1px solid rgba(255,159,28,0.3);
                      margin-left:8px">Draft</span>`
      : '';
    const approveBtn = isDraft
      ? `<button class="btn btn-primary btn-sm" style="width:100%;margin-top:10px"
                 onclick="approveTemplate('${escapeHtml(t.id)}', this)">
           <i data-lucide="check" style="width:13px;height:13px"></i>
           Approve &amp; Send
         </button>`
      : '';
    return `
    <div class="card template-card" style="${isDraft ? 'border-color:rgba(255,159,28,0.3)' : ''}">
      <div class="flex-between mb-2">
        <div style="min-width:0;padding-right:10px">
          <div class="t-title" style="display:flex;align-items:center">
            ${escapeHtml(t.title)}${draftBadge}
          </div>
          <div class="t-subject">${escapeHtml(t.subject)}</div>
        </div>
        <div class="t-actions flex-shrink-0">
          <button class="btn-icon" type="button" title="Preview"
                  onclick="openPreview('${escapeHtml(t.id)}')">
            <i data-lucide="eye" style="width:14px;height:14px;color:var(--gold-strong)"></i>
          </button>
          <button class="btn-icon" type="button" title="Edit"
                  onclick="openTemplateModal('${escapeHtml(t.id)}')">
            <i data-lucide="pencil" style="width:14px;height:14px"></i>
          </button>
          <button class="btn-icon" type="button" title="Delete"
                  onclick="deleteTemplate('${escapeHtml(t.id)}')">
            <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger)"></i>
          </button>
        </div>
      </div>
      <div class="t-preview">${escapeHtml(stripHtml(t.body))}</div>
      ${approveBtn}
    </div>`;
  }).join('');

  redrawIcons();
}

/* ═══════════════════════════════════════════════════════════════════
   TEMPLATE MODAL  (create / edit)
   ═══════════════════════════════════════════════════════════════════ */
async function openTemplateModal(id) {
  editingId = id;
  const t = id ? templates.find(item => item.id === id) : null;
  const body = t?.body || '';
  // A full email document always opens in HTML mode, and so does everything
  // else when the visual editor failed to load.
  const useHtmlMode = looksLikeFullEmailDocument(body) || !quillAvailable;

  document.getElementById('modal-template-title').textContent = t ? 'Edit Template' : 'New Template';
  document.getElementById('t-title').value = t?.title || '';
  document.getElementById('t-subject').value = t?.subject || '';

  htmlMode = useHtmlMode;
  visualPreview = false;
  document.getElementById('quill-editor').style.display = '';
  const prevFrame = document.getElementById('visual-preview-frame');
  prevFrame.style.display = 'none';
  prevFrame.srcdoc = '';
  htmlEditor.style.display = useHtmlMode ? '' : 'none';
  quillWrap.style.display = useHtmlMode ? 'none' : '';
  toggleModeBtn.innerHTML = useHtmlMode
    ? '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode'
    : '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  saveTemplateBtn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${t ? 'Save Changes' : 'Save Template'}`;

  if (quillAvailable) {
    quill.setContents([]);
    if (!useHtmlMode) quill.clipboard.dangerouslyPasteHTML(body);
  }
  htmlEditor.value = body;

  // Reset edit media fields, then load options and prefill from existing body
  const isEdit = !!id;
  const mediaPlaceholder = isEdit ? '— keep current —' : '— select —';
  document.getElementById('edit-cta-text').value = '';
  document.getElementById('edit-image-select').innerHTML = `<option value="">${mediaPlaceholder}</option>`;
  document.getElementById('edit-video-select').innerHTML = `<option value="">${mediaPlaceholder}</option>`;
  document.getElementById('edit-cta-link-select').innerHTML = `<option value="">${mediaPlaceholder}</option>`;
  document.getElementById('media-section-title').textContent = isEdit ? 'Update Image & CTA' : 'Image & CTA';
  hideAddEditCtaLink();
  await Promise.all([loadEditImages(), loadEditVideos(), loadEditCtaLinks()]);
  prefillEditMedia(body);

  templateModal.classList.remove('hidden');
  redrawIcons();
}

function closeTemplateModal() {
  templateModal.classList.add('hidden');
  editingId = null;
}

function toggleEditorMode() {
  if (!quillAvailable) {
    Toast.warn('The visual editor is unavailable right now — editing HTML directly.');
    return;
  }
  htmlMode = !htmlMode;
  if (htmlMode) {
    if (!visualPreview) {
      htmlEditor.value = quill.root.innerHTML;
    }
    visualPreview = false;
    const frame = document.getElementById('visual-preview-frame');
    frame.style.display = 'none';
    frame.srcdoc = '';
    document.getElementById('quill-editor').style.display = '';
    quillWrap.style.display = 'none';
    htmlEditor.style.display = '';
    toggleModeBtn.innerHTML = '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode';
  } else {
    const val = htmlEditor.value;
    htmlEditor.style.display = 'none';
    quillWrap.style.display = '';
    if (looksLikeFullEmailDocument(val)) {
      visualPreview = true;
      document.getElementById('quill-editor').style.display = 'none';
      const frame = document.getElementById('visual-preview-frame');
      frame.srcdoc = val;
      frame.style.display = '';
    } else {
      visualPreview = false;
      document.getElementById('quill-editor').style.display = '';
      document.getElementById('visual-preview-frame').style.display = 'none';
      quill.clipboard.dangerouslyPasteHTML(val);
    }
    toggleModeBtn.innerHTML = '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  }
  redrawIcons();
}

/* ── Save ─────────────────────────────────────────────────────────── */
async function saveTemplate(event) {
  event.preventDefault();
  let body = (htmlMode || visualPreview || !quillAvailable) ? htmlEditor.value : quill.root.innerHTML;
  body = await applyEditMediaToBody(body);
  const payload = {
    title: document.getElementById('t-title').value.trim(),
    subject: document.getElementById('t-subject').value.trim(),
    body
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

/* ── Approve (draft → approved + send campaign) ───────────────────── */
async function approveTemplate(id, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Sending…'; }
  try {
    await api.post(`/templates/${id}/approve`, {});
    Toast.success('Template approved — campaign is being sent!');
    await loadTemplates();
  } catch (err) {
    Toast.error(err?.response?.data?.detail || 'Approval failed.');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i data-lucide="check" style="width:13px;height:13px"></i> Approve &amp; Send';
      redrawIcons();
    }
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
  document.getElementById('preview-content').srcdoc = buildPreviewEmail(t);
  previewModal.classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('preview-content').srcdoc = '';
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

  let body = (template.body || '')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g, today)
    .replace(/\{\{unsubscribe_url\}\}/g, '#');

  /* ── 2. Sanitise any <img> tags in the stored body ────────────
     Remove explicit width/height attrs and force responsive sizing.
     This prevents an oversized logo or image from exploding the
     layout when a legacy template body is pasted in.             */
  body = body.replace(/<img(\s[^>]*)?>/gi, (_match, attrs) => {
    let cleaned = (attrs || '')
      .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '');

    if (/\s+style\s*=\s*["'][^"']*["']/i.test(cleaned)) {
      cleaned = cleaned.replace(
        /\s+style\s*=\s*(["'])(.*?)\1/i,
        (_styleMatch, quote, styleValue) => ` style=${quote}${styleValue};width:100%;height:auto;${quote}`
      );
      return `<img${cleaned} alt="Design Hive visual">`;
    }

    return `<img${cleaned} style="display:block;width:100%;height:auto;" alt="Design Hive visual">`;
  });

  /* ── 3. Sanitise any <video> tags in the stored body ──────────
     Same treatment as images: strip explicit width/height, force
     responsive sizing so an oversized video can't break layout. */
  body = body.replace(/<video(\s[^>]*)?>/gi, (_match, attrs) => {
    let cleaned = (attrs || '')
      .replace(/\s+width\s*=\s*["'][^"']*["']/gi, '')
      .replace(/\s+height\s*=\s*["'][^"']*["']/gi, '');

    if (/\s+style\s*=\s*["'][^"']*["']/i.test(cleaned)) {
      cleaned = cleaned.replace(
        /\s+style\s*=\s*(["'])(.*?)\1/i,
        (_styleMatch, quote, styleValue) => ` style=${quote}${styleValue};width:100%;height:auto;${quote}`
      );
      return `<video${cleaned}>`;
    }

    return `<video${cleaned} style="display:block;width:100%;height:auto;">`;
  });

  return body;
}

function looksLikeFullEmailDocument(html) {
  const value = String(html || '').toLowerCase();
  return value.includes('<html') && value.includes('</body>');
}

function resolveTemplateBody(body) {
  return looksLikeFullEmailDocument(body) ? body : getDefaultTemplateBody();
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
  return defaultTemplateBody || getEmbeddedDefaultTemplateBody();
}

async function ensureDefaultTemplateBody() {
  if (defaultTemplateBody) return defaultTemplateBody;
  if (defaultTemplateBodyPromise) return defaultTemplateBodyPromise;

  defaultTemplateBodyPromise = api.get('/templates/default-html')
    .then(response => {
      defaultTemplateBody = response?.body || getEmbeddedDefaultTemplateBody();
      return defaultTemplateBody;
    })
    .catch(() => {
      defaultTemplateBody = getEmbeddedDefaultTemplateBody();
      return defaultTemplateBody;
    })
    .finally(() => {
      defaultTemplateBodyPromise = null;
    });

  return defaultTemplateBodyPromise;
}

function getEmbeddedDefaultTemplateBody() {
  return `
<!DOCTYPE HTML
  PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to Design Hive, {{name}}!</title>
  <style type="text/css">
    * { box-sizing: border-box; line-height: inherit; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; background-color: #07090f; font-family: 'DM Sans', sans-serif; }
    table, td, tr { border-collapse: collapse; vertical-align: top; }
    a { color: inherit; }
    .email-wrapper { background-color: #07090f; width: 100%; padding: 40px 0 60px; }
    .email-container { max-width: 620px; margin: 0 auto; padding: 0 20px; }
    .header { text-align: center; padding: 0 0 28px; position: relative; }
    .hero-card { background: linear-gradient(160deg, #131b2e 0%, #0f1520 60%, #0c1119 100%); border-radius: 20px; overflow: hidden; border: 1px solid rgba(255, 159, 28, 0.12); box-shadow: 0 40px 80px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04); position: relative; margin-bottom: 16px; }
    .hero-top-bar { height: 3px; background: linear-gradient(90deg, transparent 0%, #ff9f1c 40%, #ffc84a 60%, transparent 100%); }
    .hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 300px; height: 200px; background: radial-gradient(ellipse, rgba(255, 159, 28, 0.12) 0%, transparent 70%); pointer-events: none; }
    .hero-body { padding: 56px 48px 48px; text-align: center; position: relative; }
    .welcome-eyebrow { display: inline-block; font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #ff9f1c; background: rgba(255, 159, 28, 0.1); border: 1px solid rgba(255, 159, 28, 0.25); padding: 6px 18px; border-radius: 30px; margin-bottom: 28px; }
    .hero-title { font-family: 'Cormorant Garamond', serif; font-size: 58px; font-weight: 700; line-height: 1.05; color: #ffffff; margin: 0 0 8px; letter-spacing: -0.01em; }
    .hero-title span { color: #ff9f1c; font-style: italic; }
    .hero-subtitle { font-size: 17px; color: rgba(255, 255, 255, 0.55); font-weight: 300; margin: 0 0 36px; letter-spacing: 0.01em; }
    .hero-name-highlight { color: rgba(255, 255, 255, 0.9); font-weight: 500; }
    .account-box { background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 159, 28, 0.2); border-radius: 12px; padding: 24px 28px; margin: 0 0 36px; text-align: left; position: relative; overflow: hidden; }
    .account-box::before { content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: linear-gradient(180deg, #ff9f1c, #ffc84a); }
    .account-box-label { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: #ff9f1c; margin-bottom: 16px; display: block; }
    .account-row { display: flex; align-items: center; margin-bottom: 10px; font-size: 15px; }
    .account-row:last-child { margin-bottom: 0; }
    .account-row-key { color: rgba(255, 255, 255, 0.4); font-weight: 400; width: 64px; flex-shrink: 0; font-size: 13px; font-family: 'Space Mono', monospace; }
    .account-row-val { color: #ffffff; font-weight: 500; font-size: 15px; }
    .hero-desc { font-size: 16px; color: rgba(255, 255, 255, 0.5); line-height: 1.75; margin: 0 0 40px; max-width: 420px; margin-left: auto; margin-right: auto; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #ff9f1c 0%, #ffb84a 100%); color: #07090f; padding: 17px 52px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; box-shadow: 0 8px 32px rgba(255, 159, 28, 0.35), 0 2px 8px rgba(255, 159, 28, 0.2); }
    .cta-subtext { font-size: 12px; color: rgba(255, 255, 255, 0.25); margin-top: 14px; font-family: 'Space Mono', monospace; letter-spacing: 0.05em; }
    .section-gap { height: 16px; }
    .next-card { background: linear-gradient(160deg, #131b2e 0%, #0f1520 100%); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); overflow: hidden; margin-bottom: 16px; }
    .next-card-body { padding: 44px 48px; }
    .section-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase; color: rgba(255, 159, 28, 0.6); margin-bottom: 10px; display: block; }
    .section-title { font-family: 'Cormorant Garamond', serif; font-size: 34px; font-weight: 700; color: #ffffff; margin: 0 0 36px; line-height: 1.1; }
    .section-title span { color: #ff9f1c; font-style: italic; }
    .step-item { display: flex; align-items: flex-start; padding: 20px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .step-item:last-of-type { border-bottom: none; }
    .step-number { font-family: 'Space Mono', monospace; font-size: 11px; color: #ff9f1c; background: rgba(255, 159, 28, 0.1); border: 1px solid rgba(255, 159, 28, 0.2); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-right: 18px; margin-top: 2px; text-align: center; line-height: 34px; }
    .step-content-title { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
    .step-content-desc { font-size: 14px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; }
    .closing-wrap { margin-top: 36px; padding-top: 36px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
    .closing-text { font-size: 15px; color: rgba(255, 255, 255, 0.45); line-height: 1.8; margin: 0 0 20px; }
    .closing-sig { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; font-style: italic; color: rgba(255, 255, 255, 0.75); }
    .features-card { background: linear-gradient(135deg, rgba(255, 159, 28, 0.06) 0%, rgba(255, 199, 100, 0.02) 100%); border-radius: 20px; border: 1px solid rgba(255, 159, 28, 0.12); padding: 40px 48px; margin-bottom: 16px; text-align: center; }
    .features-grid { display: table; width: 100%; margin-top: 28px; border-collapse: separate; border-spacing: 0; }
    .features-grid-row { display: table-row; }
    .feature-cell { display: table-cell; width: 33.33%; padding: 0 10px; vertical-align: top; text-align: center; }
    .feature-icon { font-size: 28px; margin-bottom: 12px; display: block; }
    .feature-title { font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 6px; letter-spacing: 0.02em; }
    .feature-desc { font-size: 12px; color: rgba(255, 255, 255, 0.3); line-height: 1.6; }
    .footer { text-align: center; padding: 40px 20px 0; }
    .social-row { margin-bottom: 30px; }
    .social-link { display: inline-block; width: 42px; height: 42px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 50%; text-align: center; line-height: 42px; margin: 0 6px; font-size: 16px; text-decoration: none; color: rgba(255, 255, 255, 0.5); }
    .footer-logo { margin-bottom: 24px; }
    .footer-logo-text { font-family: 'Space Mono', monospace; font-size: 16px; font-weight: 700; color: rgba(255, 159, 28, 0.5); letter-spacing: 0.3em; text-transform: uppercase; }
    .footer-dot { display: inline-block; width: 6px; height: 6px; background: rgba(255, 159, 28, 0.5); border-radius: 50%; margin: 0 4px 1px; vertical-align: middle; }
    .footer-legal { font-size: 12px; color: rgba(255, 255, 255, 0.2); line-height: 2; }
    .footer-legal a { color: rgba(255, 159, 28, 0.6); text-decoration: none; }
    .footer-divider { width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 159, 28, 0.3), transparent); margin: 24px auto; }
    @media only screen and (max-width: 620px) {
      .hero-body { padding: 40px 24px 36px !important; }
      .hero-title { font-size: 40px !important; }
      .next-card-body { padding: 32px 24px !important; }
      .features-card { padding: 32px 20px !important; }
      .feature-cell { display: block !important; width: 100% !important; padding: 12px 0 !important; }
      .features-grid, .features-grid-row { display: block !important; }
      .account-box { padding: 20px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <div class="header-logo-wrap" style="background: none; border: none; backdrop-filter: none; padding: 0;">
          <img src="/assets/brand/header_logo_v4.png" style="height: 78px; width: auto; max-width: 300px; display: block; margin: 0 auto;"
            alt="Design Hive Logo">
        </div>
      </div>
      <div class="hero-card">
        <div class="hero-top-bar"></div>
        <div class="hero-glow"></div>
        <div class="hero-body">
          <div class="welcome-eyebrow">&#10022; &nbsp; New Member &nbsp; &#10022;</div>
          <h1 class="hero-title">Welcome<br><span>Aboard.</span></h1>
          <p class="hero-subtitle">Hello, <span class="hero-name-highlight">{{name}}</span> &mdash; your journey officially
            starts now.</p>
          <div class="account-box">
            <span class="account-box-label">Your Account</span>
            <div class="account-row">
              <span class="account-row-key">Name</span>
              <span class="account-row-val">{{name}}</span>
            </div>
            <div class="account-row">
              <span class="account-row-key">Email</span>
              <span class="account-row-val">{{email}}</span>
            </div>
            <div class="account-row">
              <span class="account-row-key">Date</span>
              <span class="account-row-val" style="color:#ff9f1c;">{{date}}</span>
            </div>
          </div>
          <p class="hero-desc">You now have access to powerful tools designed to help you move faster, build smarter,
            and scale effortlessly.</p>
          <a href="/dashboard.html" target="_blank" class="cta-button">Go to Dashboard &rarr;</a>
          <p class="cta-subtext">No credit card required &nbsp;&middot;&nbsp; Cancel anytime</p>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="features-card">
        <span class="section-eyebrow">What you unlock</span>
        <div class="section-title" style="text-align:center; font-size: 28px;">Everything you need,<br><span>right out
            of the box.</span></div>
        <div class="features-grid">
          <div class="features-grid-row">
            <div class="feature-cell">
              <span class="feature-icon">&#9889;</span>
              <div class="feature-title">Instant Setup</div>
              <div class="feature-desc">Go live in minutes with pre-built templates.</div>
            </div>
            <div class="feature-cell">
              <span class="feature-icon">&#127912;</span>
              <div class="feature-title">Design Tools</div>
              <div class="feature-desc">Pro-grade tools designed for creative work.</div>
            </div>
            <div class="feature-cell">
              <span class="feature-icon">&#128202;</span>
              <div class="feature-title">Analytics</div>
              <div class="feature-desc">Track performance with real-time insights.</div>
            </div>
          </div>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="next-card">
        <div class="next-card-body">
          <span class="section-eyebrow">Getting started</span>
          <div class="section-title">What to do <span>next</span></div>
          <div class="step-item">
            <div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">01</div>
            <div>
              <div class="step-content-title">Explore your dashboard</div>
              <div class="step-content-desc">Get familiar with your workspace &mdash; everything's been set up just for you.</div>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">02</div>
            <div>
              <div class="step-content-title">Start your first project</div>
              <div class="step-content-desc">Create something great. Use our templates or start from scratch.</div>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number" style="font-size:14px; line-height:1; display:inline-flex; align-items:center; justify-content:center;">03</div>
            <div>
              <div class="step-content-title">Customize your workflow</div>
              <div class="step-content-desc">Tailor Design Hive to the way you work &mdash; integrations, preferences &amp; more.</div>
            </div>
          </div>
          <div class="closing-wrap">
            <p class="closing-text">This is just the beginning &mdash; we've built this experience to grow with you. Whenever
              you need help, just reply to this email. We're always here.</p>
            <div class="closing-sig">&mdash; The Design Hive Team</div>
          </div>
        </div>
      </div>
      <div class="section-gap"></div>
      <div class="footer">
        <div class="social-row">
          <a href="#" class="social-link" title="Facebook">f</a>
          <a href="#" class="social-link" title="LinkedIn" style="font-size:13px;">in</a>
          <a href="#" class="social-link" title="Instagram">&#10022;</a>
          <a href="#" class="social-link" title="X / Twitter">X</a>
        </div>
        <div class="footer-divider"></div>
        <div class="footer-logo">
          <span class="footer-logo-text">Design<span class="footer-dot"></span>Hive</span>
        </div>
        <p class="footer-legal">
          You're receiving this because you signed up for Design Hive.<br>
          <a href="{{unsubscribe_url}}">Unsubscribe</a> &nbsp;&middot;&nbsp; <a href="#">Privacy Policy</a> &nbsp;&middot;&nbsp; <a href="#">View in
            Browser</a>
        </p>
        <div class="footer-divider"></div>
        <p class="footer-legal" style="font-size: 11px; margin-top: 0;">&copy; 2025 Design Hive. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
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
   AI CONTENT GENERATION
   ═══════════════════════════════════════════════════════════════════ */
async function toggleAiPanel() {
  const panel = document.getElementById('ai-gen-panel');
  const isVisible = panel.style.display !== 'none';
  if (!isVisible) {
    await Promise.all([loadEmailImages(), loadEmailVideos(), loadCtaLinks()]);
  }
  panel.style.display = isVisible ? 'none' : 'block';
  redrawIcons();
}

function closeAiPanel() {
  document.getElementById('ai-gen-panel').style.display = 'none';
}

function toggleAiCtaInput(checked) {
  const wrap = document.getElementById('ai-cta-text-wrap');
  if (wrap) wrap.style.opacity = checked ? '1' : '0.4';
}

async function generateWithAI() {
  const brief = document.getElementById('ai-brief').value.trim();
  if (!brief) { Toast.error('Please enter a brief describing the email goal.'); return; }

  const btn = document.getElementById('ai-generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Generating…';

  try {
    const result = await api.post('/agents/generate-content', {
      brief,
      tone: document.getElementById('ai-tone').value,
      include_cta: document.getElementById('ai-include-cta').checked,
      cta_text: document.getElementById('ai-cta-text').value.trim() || 'Learn More',
      image_url: document.getElementById('ai-image-select').value || null,
      video_url: document.getElementById('ai-video-select').value || null,
      cta_url: document.getElementById('ai-cta-link-select').value || null,
    });

    // Pre-fill subject
    document.getElementById('t-subject').value = result.subject;

    // Switch to HTML mode and load the generated body
    if (!htmlMode) {
      htmlMode = true;
      visualPreview = false;
      quillWrap.style.display = 'none';
      htmlEditor.style.display = '';
      toggleModeBtn.innerHTML = '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode';
      redrawIcons();
    }
    htmlEditor.value = result.body;

    closeAiPanel();
    Toast.success('Email generated — review the subject and body, then save.');
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message || 'Content generation failed.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sparkles" style="width:13px;height:13px"></i> Generate';
    redrawIcons();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ASSET MANAGEMENT  (images + videos + CTA links)
   ═══════════════════════════════════════════════════════════════════ */
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'];

function isVideoAsset(nameOrUrl) {
  const value = String(nameOrUrl || '').toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some(ext => value.endsWith(ext));
}

async function loadEmailAssets() {
  try {
    return await api.get('/assets/images');
  } catch (_) {
    return [];
  }
}

async function loadEmailImages() {
  const assets = await loadEmailAssets();
  const images = assets.filter(a => !isVideoAsset(a.name || a.url));
  const select = document.getElementById('ai-image-select');
  select.innerHTML =
    '<option value="">Auto-select</option>' +
    images.map(img =>
      `<option value="${escapeHtml(img.url)}" data-name="${escapeHtml(img.name)}">${escapeHtml(img.name)}</option>`
    ).join('');
}

async function loadEmailVideos() {
  const assets = await loadEmailAssets();
  const videos = assets.filter(a => isVideoAsset(a.name || a.url));
  const select = document.getElementById('ai-video-select');
  select.innerHTML =
    '<option value="">None</option>' +
    videos.map(vid =>
      `<option value="${escapeHtml(vid.url)}">${escapeHtml(vid.name)}</option>`
    ).join('');
}

/** Remove the currently-selected image from the shared asset library. */
async function deleteSelectedImage(selectId) {
  const select = document.getElementById(selectId);
  const option = select.options[select.selectedIndex];
  const name = option?.dataset.name;
  if (!select.value || !name) {
    Toast.warn('Select an uploaded image to remove first.');
    return;
  }

  const confirmed = await Swal.fire({
    title: 'Remove this image?',
    text: `"${name}" will be removed from the library. Templates already using it keep their current copy.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Remove',
    confirmButtonColor: getCssVar('--danger'),
    cancelButtonColor: 'transparent',
    background: getCssVar('--bg-card'),
    color: getCssVar('--text-primary'),
    customClass: { popup: 'swal-dark' }
  });
  if (!confirmed.isConfirmed) return;

  try {
    await api.del(`/assets/images/${encodeURIComponent(name)}`);
    await Promise.all([loadEmailImages(), loadEditImages()]);
    Toast.success('Image removed.');
  } catch (e) {
    Toast.error(e.response?.data?.detail || 'Failed to remove image.');
  }
}

async function loadCtaLinks() {
  try {
    const links = await api.get('/assets/cta-links');
    const select = document.getElementById('ai-cta-link-select');
    select.innerHTML =
      '<option value="">Use default</option>' +
      links.map(link =>
        `<option value="${escapeHtml(link.url)}">${escapeHtml(link.label)}</option>`
      ).join('');
  } catch (_) { /* silently ignore */ }
}

/* ── Uploads ──────────────────────────────────────────────────────── */

// Mirrors the backend defaults so validation still works if /limits fails.
let uploadLimits = {
  image: { max_bytes: 10 * 1024 * 1024, max_label: '10.0 MB', extensions: ['.avif', '.bmp', '.gif', '.heic', '.heif', '.jfif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp'] },
  video: { max_bytes: 50 * 1024 * 1024, max_label: '50.0 MB', extensions: ['.m4v', '.mov', '.mp4', '.webm'] },
};

async function loadUploadLimits() {
  try {
    uploadLimits = await api.get('/assets/limits');
  } catch (_) {
    // Keep the defaults above; the backend enforces the real limit regardless.
  }
  renderUploadHints();
}

/** Show the limit next to each upload control so it is known before picking a file. */
function renderUploadHints() {
  document.querySelectorAll('[data-upload-hint]').forEach(node => {
    const kind = node.getAttribute('data-upload-hint');
    const limit = uploadLimits[kind];
    if (!limit) return;
    const formats = limit.extensions.map(e => e.replace('.', '')).join(', ');
    const resize = limit.auto_resize_width
      ? ` · resized to ${limit.auto_resize_width}px and converted for email automatically`
      : '';
    node.textContent = `${formats} · max ${limit.max_label}${resize}`;
  });
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(bytes / 1024, 0.1).toFixed(1)} KB`;
}

/**
 * Reject a file the server would reject anyway, before spending the upload.
 *
 * Returns an error string, or null when the file is acceptable.
 */
function validateUpload(file, kind) {
  const limit = uploadLimits[kind];
  if (!limit) return null;

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!limit.extensions.includes(ext)) {
    const hint = ext === '.svg'
      ? 'SVG cannot be used in email — export it as PNG or JPEG first.'
      : `Accepted: ${limit.extensions.join(', ')}.`;
    return `"${file.name}" is not a supported ${kind} type. ${hint}`;
  }
  if (file.size > limit.max_bytes) {
    return `"${file.name}" is ${formatBytes(file.size)} — over the ${limit.max_label} ${kind} limit. `
         + 'Compress or resize it and try again.';
  }
  if (file.size === 0) {
    return `"${file.name}" is empty.`;
  }
  return null;
}

async function uploadAssetFile(file) {
  const token = localStorage.getItem('adminToken');
  const headers = { 'X-Filename': file.name, 'Content-Type': file.type || 'application/octet-stream' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Uses API_BASE like every other call rather than a hardcoded "/api". That
  // matters when the frontend is served from somewhere other than the backend
  // (see vercel.json): setting window.ENV_API_URL sends large uploads straight
  // to the backend instead of through a proxy with its own body-size limit.
  const res = await fetch(`${API_BASE}/assets/images`, { method: 'POST', headers, body: file });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { throw new Error(`Upload failed (${res.status})`); }
  if (!res.ok) throw new Error(data.detail || `Upload failed (${res.status})`);
  return data;
}

/**
 * Shared upload flow for all four upload buttons.
 *
 * `kind` picks the limit to validate against; `after` refreshes the relevant
 * pickers and returns the `<select>` that should land on the new asset.
 */
async function handleAssetUpload(input, kind, after) {
  const file = input.files[0];
  if (!file) return;

  const problem = validateUpload(file, kind);
  if (problem) {
    Toast.error(problem);
    input.value = '';
    return;
  }

  const label = input.closest('label');
  if (label) label.style.opacity = '0.5';
  try {
    const data = await uploadAssetFile(file);
    const select = await after(data);
    if (select) select.value = data.url;

    if (data.warning) {
      // The file stored fine but will not load in an inbox — say so now rather
      // than letting a campaign go out with a broken image.
      Toast.error(`"${file.name}": ${data.warning}`);
      return;
    }

    // Say what happened to the file: it may have been converted to an
    // email-safe format, scaled down, or renamed to avoid a collision.
    const details = [];
    if (data.note) details.push(data.note);
    if (data.name !== file.name) details.push(`saved as "${data.name}"`);
    Toast.success(`"${file.name}" uploaded${details.length ? ' — ' + details.join(', ') : ''}.`);
  } catch (e) {
    Toast.error(e.message || `${kind === 'video' ? 'Video' : 'Image'} upload failed.`);
  } finally {
    if (label) label.style.opacity = '1';
    input.value = '';
  }
}

function showAddCtaLink() {
  document.getElementById('add-cta-link-form').style.display = '';
}

function hideAddCtaLink() {
  document.getElementById('add-cta-link-form').style.display = 'none';
  document.getElementById('new-cta-label').value = '';
  document.getElementById('new-cta-url').value = '';
}

async function saveNewCtaLink() {
  const label = document.getElementById('new-cta-label').value.trim();
  const url   = document.getElementById('new-cta-url').value.trim();
  if (!label || !url) { Toast.error('Both a label and a URL are required.'); return; }
  try {
    await api.post('/assets/cta-links', { label, url });
    await loadCtaLinks();
    document.getElementById('ai-cta-link-select').value = url;
    hideAddCtaLink();
    Toast.success('CTA link saved.');
  } catch (e) {
    Toast.error(e.response?.data?.detail || 'Failed to save link.');
  }
}

/* The four upload buttons differ only in which pickers they refresh. */
async function uploadEmailImage(input) {
  await handleAssetUpload(input, 'image', async () => {
    await loadEmailImages();
    return document.getElementById('ai-image-select');
  });
}

async function uploadEmailVideo(input) {
  await handleAssetUpload(input, 'video', async () => {
    await loadEmailVideos();
    return document.getElementById('ai-video-select');
  });
}

async function uploadEditImage(input) {
  await handleAssetUpload(input, 'image', async () => {
    await Promise.all([loadEditImages(), loadEmailImages()]);
    return document.getElementById('edit-image-select');
  });
}

async function uploadEditVideo(input) {
  await handleAssetUpload(input, 'video', async () => {
    await Promise.all([loadEditVideos(), loadEmailVideos()]);
    return document.getElementById('edit-video-select');
  });
}

/* ═══════════════════════════════════════════════════════════════════
   EDIT-MODAL IMAGE & CTA
   ═══════════════════════════════════════════════════════════════════ */
async function loadEditImages() {
  const assets = await loadEmailAssets();
  const images = assets.filter(a => !isVideoAsset(a.name || a.url));
  const select = document.getElementById('edit-image-select');
  const placeholder = editingId ? '— keep current —' : '— select image —';
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    (editingId ? `<option value="${REMOVE_MEDIA}">— remove image —</option>` : '') +
    images.map(img =>
      `<option value="${escapeHtml(img.url)}" data-name="${escapeHtml(img.name)}">${escapeHtml(img.name)}</option>`
    ).join('');
}

async function loadEditVideos() {
  const assets = await loadEmailAssets();
  const videos = assets.filter(a => isVideoAsset(a.name || a.url));
  const select = document.getElementById('edit-video-select');
  const placeholder = editingId ? '— keep current —' : '— select video —';
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    (editingId ? `<option value="${REMOVE_MEDIA}">— remove video —</option>` : '') +
    videos.map(vid =>
      `<option value="${escapeHtml(vid.url)}">${escapeHtml(vid.name)}</option>`
    ).join('');
}

async function loadEditCtaLinks() {
  try {
    const links = await api.get('/assets/cta-links');
    const select = document.getElementById('edit-cta-link-select');
    const placeholder = editingId ? '— keep current —' : '— select link —';
    select.innerHTML =
      `<option value="">${placeholder}</option>` +
      links.map(link =>
        `<option value="${escapeHtml(link.url)}">${escapeHtml(link.label)}</option>`
      ).join('');
  } catch (_) {}
}

/* ── Hero media ───────────────────────────────────────────────────────
   The generated email marks its hero with class="dh-hero-img" (see
   backend/email_direct_template.py). That marker is the anchor for both
   reading the current hero and replacing it, so edits land on the hero and
   never on the branded header image, the social icons, or the footer.
   ─────────────────────────────────────────────────────────────────────── */

// Sentinel value for the "remove" option in the edit pickers. An empty value
// means "keep whatever the template already has", so clearing needs its own.
const REMOVE_MEDIA = '__remove__';

const HERO_IMG_RE = /<img\b[^>]*\bclass="[^"]*\bdh-hero-img\b[^"]*"[^>]*>/i;
const HERO_VIDEO_RE = /<video\b[^>]*\bclass="[^"]*\bdh-hero-img\b[^"]*"[^>]*>[\s\S]*?<\/video>/i;

// CTA buttons authored through the editor carry class="cta-button" (see
// email_template_default.py / the embedded default body below). AI-generated
// bodies built by build_text_email_html() instead wrap a bare <a> in a
// class="dh-cta-td" cell — this fallback keeps those anchors discoverable so
// editing an AI-generated template's CTA actually finds something to change.
const CTA_BUTTON_RE = /<a\b([^>]*\bclass="[^"]*\bcta-button\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/i;
const CTA_TD_ANCHOR_RE = /(<td\b[^>]*\bclass="[^"]*\bdh-cta-td\b[^"]*"[^>]*>[\s\S]*?<a\b)([^>]*)(>)([\s\S]*?)(<\/a>)/i;

function findCtaAnchor(body) {
  const direct = body.match(CTA_BUTTON_RE);
  if (direct) return { attrs: direct[1], content: direct[2] };
  const wrapped = body.match(CTA_TD_ANCHOR_RE);
  if (wrapped) return { attrs: wrapped[2], content: wrapped[4] };
  return null;
}

// The <tr> wrapping a hero element, so a swap replaces the whole row.
const HERO_IMG_ROW_RE =
  /<tr>\s*<td\b[^>]*>\s*<img\b[^>]*\bclass="[^"]*\bdh-hero-img\b[^"]*"[^>]*>\s*<\/td>\s*<\/tr>/i;
const HERO_VIDEO_ROW_RE =
  /<tr>\s*<td\b[^>]*>\s*<video\b[^>]*\bclass="[^"]*\bdh-hero-img\b[^"]*"[^>]*>[\s\S]*?<\/video>\s*<\/td>\s*<\/tr>/i;

// Opening of the white content table the hero row belongs to.
const CONTENT_TABLE_OPEN_RE =
  /(<td\b[^>]*\bclass="content-td"[^>]*>\s*<table\b[^>]*>)/i;

/** Hero row markup matching what the backend generates, so edits stay consistent. */
// The email content column is 600px. Artwork narrower than that is centred at
// its own size rather than stretched, which is what made small logos and badges
// look soft and over-scaled in the inbox.
const EMAIL_COLUMN_WIDTH = 600;

/**
 * Measure an image so the hero can be sized to fit rather than always stretched.
 *
 * Resolves to the natural width, or the full column width if the image cannot be
 * measured — an unreachable asset must not block saving a template.
 */
function measureImageWidth(url) {
  return new Promise(resolve => {
    const img = new Image();
    const done = width => resolve(Math.max(1, Math.min(width || EMAIL_COLUMN_WIDTH, EMAIL_COLUMN_WIDTH)));
    const timer = setTimeout(() => done(EMAIL_COLUMN_WIDTH), 4000);
    img.onload = () => { clearTimeout(timer); done(img.naturalWidth); };
    img.onerror = () => { clearTimeout(timer); done(EMAIL_COLUMN_WIDTH); };
    img.src = url;
  });
}

function heroRowHtml(url, isVideo, width = EMAIL_COLUMN_WIDTH) {
  const w = Math.round(width);
  // `width` attribute for Outlook, max-width for everyone else, and margin auto
  // so anything narrower than the column stays centred.
  const style = `display:block;width:100%;max-width:${w}px;height:auto;border:0;margin:0 auto;`;
  const media = isVideo
    ? `<video class="dh-hero-img" src="${url}" width="${w}" controls playsinline\n` +
      `                     style="${style}">\n` +
      `              </video>`
    : `<img class="dh-hero-img" src="${url}" alt="Design Hive"\n` +
      `                   width="${w}"\n` +
      `                   style="${style}">`;

  return `
          <tr>
            <td align="center" style="padding:0;line-height:0;font-size:0;">
              ${media}
            </td>
          </tr>`;
}

/** Read the current hero's src out of a body, or null. */
function currentHeroSrc(body, isVideo) {
  const tag = (body || '').match(isVideo ? HERO_VIDEO_RE : HERO_IMG_RE);
  if (!tag) return null;
  const src = tag[0].match(/\bsrc="([^"]*)"/i);
  return src ? src[1] : null;
}

function prefillEditMedia(body) {
  if (!body) return;

  // Read the hero straight off its marker. Falling back to "first <img> whose
  // src is in the library" used to mis-detect the header image as the hero.
  const imageSelect = document.getElementById('edit-image-select');
  const videoSelect = document.getElementById('edit-video-select');

  const heroImage = currentHeroSrc(body, false);
  if (heroImage) {
    if (!Array.from(imageSelect.options).some(o => o.value === heroImage)) {
      // The hero points somewhere outside the asset library — show it anyway so
      // the picker reflects reality instead of reading as "no image set".
      imageSelect.insertAdjacentHTML(
        'beforeend',
        `<option value="${escapeHtml(heroImage)}">${escapeHtml(heroImage.split('/').pop())} (in use)</option>`
      );
    }
    imageSelect.value = heroImage;
  }

  const heroVideo = currentHeroSrc(body, true);
  if (heroVideo) {
    if (!Array.from(videoSelect.options).some(o => o.value === heroVideo)) {
      videoSelect.insertAdjacentHTML(
        'beforeend',
        `<option value="${escapeHtml(heroVideo)}">${escapeHtml(heroVideo.split('/').pop())} (in use)</option>`
      );
    }
    videoSelect.value = heroVideo;
  }

  // Detect CTA button text and link
  const cta = findCtaAnchor(body);
  if (cta) {
    const innerText = cta.content
      .replace(/<[^>]*>/g, '')
      .replace(/&rarr;/g, '→').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .trim();
    if (innerText) document.getElementById('edit-cta-text').value = innerText;

    const hrefMatch = cta.attrs.match(/\bhref="([^"]*)"/i);
    if (hrefMatch) {
      const select = document.getElementById('edit-cta-link-select');
      const opt = Array.from(select.options).find(o => o.value === hrefMatch[1]);
      if (opt) select.value = hrefMatch[1];
    }
  }
}

/**
 * Put `url` in the body as the hero, whatever state the body is currently in.
 *
 * Image and video heroes are mutually exclusive — the generator renders one or
 * the other — so setting one removes the other.
 */
async function setHeroMedia(body, url, isVideo) {
  body = body || '';
  // Video dimensions are not known until it downloads, so video keeps the full
  // column; images are measured and sized to fit.
  const width = isVideo ? EMAIL_COLUMN_WIDTH : await measureImageWidth(url);
  const row = heroRowHtml(url, isVideo, width);

  // 1. A hero of the same kind already exists: swap its src and resize it to the
  //    new artwork, so replacing a 600px hero with a 320px badge does not leave
  //    the old stretched width behind.
  const sameKind = isVideo ? HERO_VIDEO_RE : HERO_IMG_RE;
  if (sameKind.test(body)) {
    return body.replace(sameKind, tag => tag
      .replace(/(\bsrc=")[^"]*(")/i, `$1${url}$2`)
      .replace(/(\bwidth=")[^"]*(")/i, `$1${Math.round(width)}$2`)
      .replace(/max-width:\s*\d+px/i, `max-width:${Math.round(width)}px`));
  }

  // 2. A hero of the other kind exists: replace that whole row.
  const otherRow = isVideo ? HERO_IMG_ROW_RE : HERO_VIDEO_ROW_RE;
  if (otherRow.test(body)) {
    return body.replace(otherRow, row.trim());
  }

  // 3. The other kind exists but not inside a recognisable row — drop the bare
  //    element and fall through to inserting a proper row.
  const otherKind = isVideo ? HERO_IMG_RE : HERO_VIDEO_RE;
  if (otherKind.test(body)) {
    body = body.replace(otherKind, '');
  }

  // 4. No hero yet. Insert one at the top of the white content table.
  //    Previously this dropped a bare <img> immediately after <body>, which put
  //    it outside the layout table and above the branded header.
  if (CONTENT_TABLE_OPEN_RE.test(body)) {
    return body.replace(CONTENT_TABLE_OPEN_RE, `$1${row}`);
  }

  // 5. A full document with no recognisable content table — wrap the media in a
  //    centred table so it still renders correctly in an email client.
  const w = Math.round(width);
  const inline = `display:block;width:100%;max-width:${w}px;height:auto;border:0;margin:0 auto;`;
  const standalone =
    `<table width="100%" border="0" cellpadding="0" cellspacing="0">` +
    `<tr><td align="center" style="padding:0;line-height:0;font-size:0;">` +
    (isVideo
      ? `<video class="dh-hero-img" src="${url}" width="${w}" controls playsinline style="${inline}"></video>`
      : `<img class="dh-hero-img" src="${url}" alt="Design Hive" width="${w}" style="${inline}">`) +
    `</td></tr></table>`;

  if (looksLikeFullEmailDocument(body)) {
    return body.replace(/(<body\b[^>]*>)/i, `$1\n${standalone}\n`);
  }
  return `${standalone}\n${body}`;
}

/** Remove the hero of the given kind, including its layout row. */
function clearHeroMedia(body, isVideo) {
  const rowRe = isVideo ? HERO_VIDEO_ROW_RE : HERO_IMG_ROW_RE;
  if (rowRe.test(body)) return body.replace(rowRe, '');
  return body.replace(isVideo ? HERO_VIDEO_RE : HERO_IMG_RE, '');
}

async function applyEditMediaToBody(body) {
  const imageUrl = document.getElementById('edit-image-select').value;
  const videoUrl = document.getElementById('edit-video-select').value;
  const ctaText  = document.getElementById('edit-cta-text').value.trim();
  const ctaLink  = document.getElementById('edit-cta-link-select').value;

  const removeImage = imageUrl === REMOVE_MEDIA;
  const removeVideo = videoUrl === REMOVE_MEDIA;

  // Video wins when both are set, matching build_text_email_html().
  if (videoUrl && !removeVideo) {
    body = await setHeroMedia(body, videoUrl, true);
  } else if (imageUrl && !removeImage) {
    body = await setHeroMedia(body, imageUrl, false);
  }
  if (removeVideo) body = clearHeroMedia(body, true);
  if (removeImage) body = clearHeroMedia(body, false);

  if (ctaLink || ctaText) {
    const applyHref = attrs => {
      if (!ctaLink) return attrs;
      return /\bhref="/i.test(attrs)
        ? attrs.replace(/(\bhref=")[^"]*(")/i, `$1${ctaLink}$2`)
        : `${attrs} href="${ctaLink}"`;
    };

    if (CTA_BUTTON_RE.test(body)) {
      body = body.replace(CTA_BUTTON_RE, (match, attrs, content) =>
        `<a${applyHref(attrs)}>${ctaText || content}</a>`
      );
    } else if (CTA_TD_ANCHOR_RE.test(body)) {
      // No class="cta-button" here yet (an AI-generated CTA built before that
      // marker existed) — add it so the template is editable normally next time.
      body = body.replace(CTA_TD_ANCHOR_RE, (match, prefix, attrs, gt, content, closeTag) => {
        let openAttrs = applyHref(attrs);
        openAttrs = /\bclass="/i.test(openAttrs)
          ? openAttrs.replace(/\bclass="([^"]*)"/i, (m, cls) => `class="${cls} cta-button"`)
          : `${openAttrs} class="cta-button"`;
        return `${prefix}${openAttrs}${gt}${ctaText || content}${closeTag}`;
      });
    }
  }

  return body;
}

function showAddEditCtaLink() {
  document.getElementById('add-edit-cta-link-form').style.display = '';
}

function hideAddEditCtaLink() {
  document.getElementById('add-edit-cta-link-form').style.display = 'none';
  document.getElementById('new-edit-cta-label').value = '';
  document.getElementById('new-edit-cta-url').value = '';
}

async function saveNewEditCtaLink() {
  const label = document.getElementById('new-edit-cta-label').value.trim();
  const url   = document.getElementById('new-edit-cta-url').value.trim();
  if (!label || !url) { Toast.error('Both a label and a URL are required.'); return; }
  try {
    await api.post('/assets/cta-links', { label, url });
    await Promise.all([loadEditCtaLinks(), loadCtaLinks()]);
    document.getElementById('edit-cta-link-select').value = url;
    hideAddEditCtaLink();
    Toast.success('CTA link saved.');
  } catch (e) {
    Toast.error(e.response?.data?.detail || 'Failed to save link.');
  }
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

function redrawIcons() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

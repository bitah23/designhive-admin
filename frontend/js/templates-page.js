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

function buildPreviewEmail(template) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const body = (template.body || '')
    .replace(/\{\{name\}\}/g, 'John Doe')
    .replace(/\{\{email\}\}/g, 'john@example.com')
    .replace(/\{\{date\}\}/g, today);

  return `
    <div style="padding:28px 28px 0;background:linear-gradient(135deg,#fff6db,#fff)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px">
        <img src="/assets/brand/logo.png" alt="Design Hive" style="width:128px;height:auto">
        <div style="padding:8px 12px;border-radius:999px;background:#f5e5a4;color:#7b183a;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Admin Dispatch</div>
      </div>
      <div style="padding:28px;border-radius:24px;background:linear-gradient(135deg,#8d173c,#b62453);color:#fff">
        <div style="font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;opacity:.82">DesignHive AI</div>
        <h1 style="margin:12px 0 10px;font-size:32px;line-height:1.08">${escapeHtml(template.subject)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.7;max-width:440px;opacity:.9">A more polished, dashboard-aware email with stronger hierarchy, cleaner content pacing, and a real footer your team can ship confidently.</p>
      </div>
    </div>
    <div style="padding:28px 28px 22px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8d173c;margin-bottom:12px">Message</div>
      <div style="font-size:15px;line-height:1.8;color:#243041">${body}</div>
      <div style="margin-top:24px;padding:18px 20px;border-radius:18px;background:#f7f2e4;border:1px solid #eadfbc">
        <div style="font-size:13px;font-weight:700;color:#8d173c;margin-bottom:8px">Dashboard shortcut</div>
        <a href="/dashboard.html" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#8d173c;color:#fff;text-decoration:none;font-weight:700">Open Dashboard</a>
      </div>
    </div>
    <div style="padding:0 28px 28px">
      <div style="padding:20px;border-radius:18px;background:#111827;color:#d5d9e5">
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin-bottom:6px">DesignHive AI</div>
            <div style="font-size:13px;line-height:1.7">Campaign workflows, template previews, user targeting, and delivery tracking.</div>
          </div>
          <div style="font-size:13px;line-height:1.8">
            <div>support@designhive.ai</div>
            <div>admin.designhive.ai</div>
          </div>
        </div>
        <div style="margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font-size:13px;line-height:1.8;color:#cbd5e1">Thanks for building with us.<br>The DesignHive AI team</div>
      </div>
    </div>
  `;
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

function getDefaultTemplateBody() {
  return '<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#334155">Hi {{name}},</p><p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155">Your DesignHive workspace is ready to help you shape stronger campaigns and cleaner admin workflows.</p><p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#334155">We now support richer previews, clearer delivery visibility, and a more polished sending experience.</p><p style="margin:0;font-size:15px;line-height:1.8;color:#334155">Thanks,<br>The DesignHive AI team</p>';
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

let quill;
let templates = [];
let editingId = null;
let htmlMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  quill = new Quill('#quill-editor', {
    theme: 'snow',
    placeholder: 'Write your email here...',
    modules: {
      toolbar: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });

  document.getElementById('template-form').addEventListener('submit', saveTemplate);
  await loadTemplates();
});

async function loadTemplates() {
  try {
    templates = await api.get('/templates');
    renderGrid();
  } catch (err) {
    const message = err.response?.data?.detail || err.message;
    Toast.error(message);
    document.getElementById('templates-grid').innerHTML = `<div class="empty-state" style="grid-column:1/-1">${esc(message)}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById('templates-grid');
  if (templates.length === 0) {
    grid.innerHTML = `<div class="empty-state dashboard-empty-state" style="grid-column:1/-1">
      <i data-lucide="file-text" style="width:40px;height:40px;opacity:0.2;margin-bottom:10px"></i>
      <p>No templates yet. Create your first one.</p>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  grid.innerHTML = templates.map(t => `
    <div class="card template-card">
      <div class="flex-between mb-2">
        <div style="overflow:hidden;padding-right:8px">
          <div class="t-title">${esc(t.title)}</div>
          <div class="t-subject">${esc(t.subject)}</div>
        </div>
        <div class="t-actions flex-shrink-0">
          <button class="btn-icon" title="Preview" onclick="openPreview('${esc(t.id)}')">
            <i data-lucide="eye" style="width:14px;height:14px;color:var(--gold)"></i>
          </button>
          <button class="btn-icon" title="Edit" onclick="openTemplateModal('${esc(t.id)}')">
            <i data-lucide="edit-2" style="width:14px;height:14px"></i>
          </button>
          <button class="btn-icon" title="Delete" onclick="deleteTemplate('${esc(t.id)}')">
            <i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger)"></i>
          </button>
        </div>
      </div>
      <div class="t-preview">${esc(stripHtml(t.body)) || 'No content yet...'}</div>
    </div>`).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openTemplateModal(id) {
  editingId = id;
  const t = id ? templates.find(x => x.id === id) : null;

  document.getElementById('modal-template-title').textContent = t ? 'Edit Template' : 'New Template';
  document.getElementById('t-title').value = t ? t.title : '';
  document.getElementById('t-subject').value = t ? t.subject : '';
  document.getElementById('save-template-btn').innerHTML =
    `<i data-lucide="save" style="width:14px;height:14px"></i> ${t ? 'Save Changes' : 'Save Template'}`;

  htmlMode = false;
  document.getElementById('quill-wrap').style.display = '';
  document.getElementById('html-editor').style.display = 'none';
  document.getElementById('toggle-mode-btn').innerHTML =
    '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';

  quill.setContents([]);
  if (t) quill.clipboard.dangerouslyPasteHTML(t.body || '');

  document.getElementById('template-modal').classList.remove('hidden');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeTemplateModal() {
  document.getElementById('template-modal').classList.add('hidden');
  editingId = null;
}

function toggleEditorMode() {
  htmlMode = !htmlMode;
  if (htmlMode) {
    document.getElementById('html-editor').value = quill.root.innerHTML;
    document.getElementById('quill-wrap').style.display = 'none';
    document.getElementById('html-editor').style.display = '';
    document.getElementById('toggle-mode-btn').innerHTML =
      '<i data-lucide="eye" style="width:12px;height:12px"></i> Visual Mode';
  } else {
    quill.clipboard.dangerouslyPasteHTML(document.getElementById('html-editor').value);
    document.getElementById('quill-wrap').style.display = '';
    document.getElementById('html-editor').style.display = 'none';
    document.getElementById('toggle-mode-btn').innerHTML =
      '<i data-lucide="code" style="width:12px;height:12px"></i> HTML Mode';
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function saveTemplate(e) {
  e.preventDefault();
  const btn = document.getElementById('save-template-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const body = htmlMode
    ? document.getElementById('html-editor').value
    : quill.root.innerHTML;

  const payload = {
    title:   document.getElementById('t-title').value.trim(),
    subject: document.getElementById('t-subject').value.trim(),
    body,
  };

  try {
    if (editingId) {
      const updated = await api.put(`/templates/${editingId}`, payload);
      templates = templates.map(t => t.id === editingId ? updated : t);
      Toast.success('Template updated');
    } else {
      const created = await api.post('/templates', payload);
      templates.unshift(created);
      Toast.success('Template created');
    }
    renderGrid();
    closeTemplateModal();
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="save" style="width:14px;height:14px"></i> ${editingId ? 'Save Changes' : 'Save Template'}`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

async function deleteTemplate(id) {
  const t = templates.find(x => x.id === id);
  const result = await Swal.fire({
    title: 'Delete this template?',
    text: 'This cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#374151',
    background: '#11131A',
    color: '#fff',
  });
  if (!result.isConfirmed) return;

  try {
    await api.del(`/templates/${id}`);
    templates = templates.filter(x => x.id !== id);
    renderGrid();
    Toast.success('Template deleted');
  } catch (err) {
    Toast.error(err.response?.data?.detail || err.message);
  }
}

function openPreview(id) {
  const t = templates.find(x => x.id === id);
  if (!t) return;
  const html = (t.body || '')
    .replace(/\{\{name\}\}/g, '<strong style="color:#FACC15">John Doe</strong>')
    .replace(/\{\{email\}\}/g, '<em style="color:#9CA3AF">john@example.com</em>')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }));
  document.getElementById('preview-content').innerHTML = html;
  document.getElementById('preview-modal').classList.remove('hidden');
}

function closePreviewModal() {
  document.getElementById('preview-modal').classList.add('hidden');
}

function insertVariable(variable) {
  if (htmlMode) {
    const editor = document.getElementById('html-editor');
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? editor.value.length;
    editor.value = `${editor.value.slice(0, start)}${variable}${editor.value.slice(end)}`;
    editor.focus();
    editor.setSelectionRange(start + variable.length, start + variable.length);
    return;
  }

  const range = quill.getSelection(true);
  const index = range ? range.index : quill.getLength();
  quill.insertText(index, variable);
  quill.setSelection(index + variable.length);
}

function stripHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

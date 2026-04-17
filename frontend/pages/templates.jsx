import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Edit2, Trash2, Eye, X, Save, Code, Mail, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../services/api';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

const EMPTY = { title: '', subject: '', body: '' };

// ── Create / Edit Modal ─────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id;
  const [form, setForm] = useState(template || EMPTY);
  const [htmlMode, setHtmlMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/templates/${template.id}`, form);
      } else {
        await api.post('/templates', form);
      }
      toast.success(isEdit ? 'Template updated' : 'Template created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 780, maxHeight: '92vh' }}>
        <div className="modal-header-bar">
          <div className="d-flex align-items-center gap-3">
            <div style={{ background: 'var(--gold-dim)', borderRadius: 10, padding: 8 }}>
              <FileText size={18} className="text-gold" />
            </div>
            <p className="fw-bold text-white mb-0">{isEdit ? 'Edit Template' : 'New Template'}</p>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body-pad d-flex flex-column gap-4" style={{ overflowY: 'auto', maxHeight: 'calc(92vh - 140px)' }}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="label-upper d-block mb-2">Template Name *</label>
                <input className="form-control py-2" placeholder="e.g. Welcome Email" value={form.title} onChange={e => set('title', e.target.value)} required />
              </div>
              <div className="col-md-6">
                <label className="label-upper d-block mb-2">Email Subject *</label>
                <input className="form-control py-2" placeholder="e.g. Welcome to DesignHive!" value={form.subject} onChange={e => set('subject', e.target.value)} required />
              </div>
            </div>

            <div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className="label-upper">Email Body *</label>
                <button
                  type="button"
                  onClick={() => setHtmlMode(m => !m)}
                  className="d-flex align-items-center gap-1 px-3 py-1 rounded-3"
                  style={{ background: htmlMode ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: 'none', color: htmlMode ? '#000' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Code size={13} /> {htmlMode ? 'Visual Editor' : 'HTML'}
                </button>
              </div>

              {htmlMode ? (
                <textarea
                  className="form-control font-monospace"
                  rows={12}
                  value={form.body}
                  onChange={e => set('body', e.target.value)}
                  placeholder="Paste your HTML here..."
                  style={{ fontSize: '0.82rem', lineHeight: 1.7, resize: 'vertical' }}
                />
              ) : (
                <div className="rounded-3 overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <ReactQuill theme="snow" value={form.body} onChange={v => set('body', v)} modules={QUILL_MODULES} placeholder="Write your email here..." />
                </div>
              )}
              <p className="mt-2 mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Variables: <code className="text-gold">{'{{name}}'}</code> &nbsp; <code className="text-gold">{'{{email}}'}</code> &nbsp; <code className="text-gold">{'{{date}}'}</code>
              </p>
            </div>
          </div>

          <div className="modal-footer-bar">
            <button type="button" className="btn-secondary-dark" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary d-flex align-items-center gap-2 px-4" style={{ borderRadius: 10 }} disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm" /> : <><Save size={15} /> {isEdit ? 'Save Changes' : 'Save Template'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Preview Modal ───────────────────────────────────────────────────
function PreviewModal({ body, onClose }) {
  const html = body
    .replace(/\{\{name\}\}/g, '<strong style="color:#FACC15">John Doe</strong>')
    .replace(/\{\{email\}\}/g, '<em style="color:#9CA3AF">john@example.com</em>')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 680, maxHeight: '90vh' }}>
        <div className="modal-header-bar">
          <div className="d-flex align-items-center gap-3">
            <div style={{ background: 'var(--gold)', borderRadius: 10, padding: 8 }}><Mail size={18} style={{ color: '#000' }} /></div>
            <p className="fw-bold text-white mb-0">Email Preview</p>
          </div>
          <button className="btn-icon-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body-pad" style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)', background: '#f3f4f6' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '32px', maxWidth: 560, margin: '0 auto', color: '#333', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
        <div className="modal-footer-bar justify-content-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="mb-0" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sample data: John Doe · john@example.com</p>
        </div>
      </div>
    </div>
  );
}

// ── Templates Page ──────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(undefined);  // undefined = closed, null = new, obj = edit
  const [previewBody, setPreviewBody] = useState(null);

  const load = () => api.get('/templates').then(r => setTemplates(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (t) => {
    const result = await Swal.fire({
      title: 'Delete Template?',
      text: `"${t.title}" will be permanently deleted.`,
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
      await api.delete(`/templates/${t.id}`);
      setTemplates(p => p.filter(x => x.id !== t.id));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-white mb-1">Email Templates</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Create and manage your email templates</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2 px-4" style={{ borderRadius: 10 }} onClick={() => setEditTarget(null)}>
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="row g-3">
          {[1,2,3].map(i => <div key={i} className="col-md-6 col-lg-4"><div className="skeleton" style={{ height: 180 }} /></div>)}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>
          <FileText size={48} className="mb-3 opacity-25" />
          <p>No templates yet. Create your first one.</p>
        </div>
      ) : (
        <div className="row g-3">
          {templates.map(t => (
            <div key={t.id} className="col-md-6 col-lg-4">
              <div className="glass-card p-4 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="overflow-hidden pe-2">
                    <p className="fw-bold text-white mb-1 text-truncate">{t.title}</p>
                    <p className="mb-0 text-truncate" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.subject}</p>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn-icon-close" onClick={() => setPreviewBody(t.body)} title="Preview"><Eye size={14} className="text-gold" /></button>
                    <button className="btn-icon-close" onClick={() => setEditTarget(t)} title="Edit"><Edit2 size={14} /></button>
                    <button className="btn-icon-close" onClick={() => handleDelete(t)} title="Delete"><Trash2 size={14} className="text-danger" /></button>
                  </div>
                </div>
                <div
                  className="mt-auto pt-3 cursor-pointer line-clamp-3"
                  style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.6 }}
                  onClick={() => setPreviewBody(t.body)}
                >
                  {t.body.replace(/<[^>]*>/g, '').substring(0, 140) || 'No content yet...'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget !== undefined && (
        <TemplateModal
          template={editTarget}
          onClose={() => setEditTarget(undefined)}
          onSaved={() => { setLoading(true); load(); }}
        />
      )}
      {previewBody !== null && <PreviewModal body={previewBody} onClose={() => setPreviewBody(null)} />}
    </div>
  );
}

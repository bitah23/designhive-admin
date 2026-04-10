import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText, X, Save, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const SAMPLE_VARS = { name: 'Jane Doe', email: 'jane@example.com', date: 'April 9, 2026' }

function previewTemplate(text) {
  return Object.entries(SAMPLE_VARS).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    text
  )
}

function Modal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id
  const [form, setForm] = useState({
    title:     template?.title     ?? '',
    subject:   template?.subject   ?? '',
    body:      template?.body      ?? '',
    variables: template?.variables ?? ['name', 'email', 'date'],
  })
  const [preview, setPreview] = useState(false)
  const [saving, setSaving]   = useState(false)
  const bodyRef = useRef(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const insertVar = (v) => {
    const el = bodyRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const newBody = form.body.slice(0, start) + `{{${v}}}` + form.body.slice(end)
    setForm((f) => ({ ...f, body: newBody }))
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + v.length + 4
      el.focus()
    }, 0)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.body.trim()) {
      toast.error('All fields are required')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/api/templates/${template.id}`, form)
        toast.success('Template updated')
      } else {
        await api.post('/api/templates/', form)
        toast.success('Template created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-lg">
            {isEdit ? 'Edit Template' : 'New Template'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {preview ? <><EyeOff className="w-3.5 h-3.5" />Editor</> : <><Eye className="w-3.5 h-3.5" />Preview</>}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Template Title</label>
              <input className="input" placeholder="e.g. Welcome Email" value={form.title} onChange={set('title')} />
            </div>
            <div>
              <label className="label">Email Subject</label>
              <input className="input" placeholder="e.g. Welcome, {{name}}!" value={form.subject} onChange={set('subject')} />
            </div>
          </div>

          {/* Variable chips */}
          <div>
            <label className="label">Insert Variable</label>
            <div className="flex gap-2 flex-wrap">
              {(form.variables ?? []).map((v) => (
                <button
                  key={v}
                  onClick={() => insertVar(v)}
                  className="px-2.5 py-1 bg-brand-50 text-brand-600 border border-brand-200 rounded-full text-xs font-mono hover:bg-brand-100 transition"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Body editor / preview */}
          <div>
            <label className="label">HTML Body</label>
            {preview ? (
              <iframe
                srcDoc={previewTemplate(form.body)}
                className="w-full h-80 border border-slate-200 rounded-lg"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : (
              <textarea
                ref={bodyRef}
                className="input font-mono text-xs resize-none h-80"
                placeholder="<h1>Hello {{name}}</h1><p>Your email here...</p>"
                value={form.body}
                onChange={set('body')}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : <><Save className="w-3.5 h-3.5" />Save Template</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ template, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await api.delete(`/api/templates/${template.id}`)
      toast.success('Template deleted')
      onDeleted()
      onClose()
    } catch {
      toast.error('Failed to delete template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-center font-semibold text-slate-900 mb-1">Delete Template?</h2>
        <p className="text-center text-sm text-slate-500 mb-6">
          "<strong>{template.title}</strong>" will be permanently deleted.
          Email logs that used this template will remain.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="btn-danger flex-1 justify-center">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // null | { mode: 'edit'|'create', template? }
  const [deleting, setDeleting]   = useState(null)   // template to delete

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/api/templates/')
      setTemplates(data)
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 h-40 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No templates yet</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Create your first email template to get started.</p>
          <button onClick={() => setModal({ mode: 'create' })} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card p-5 flex flex-col group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-brand-600" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({ mode: 'edit', template: t })}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(t)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 text-sm mb-1 leading-snug">{t.title}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.subject}</p>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {(t.variables ?? []).slice(0, 3).map((v) => (
                    <span key={v} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded font-mono">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-slate-400">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          template={modal.mode === 'edit' ? modal.template : null}
          onClose={() => setModal(null)}
          onSaved={fetchTemplates}
        />
      )}
      {deleting && (
        <DeleteConfirm
          template={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={fetchTemplates}
        />
      )}
    </div>
  )
}

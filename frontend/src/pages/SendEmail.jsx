import { useEffect, useState } from 'react'
import { Send, Users, UserCheck, Eye, EyeOff, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

const SAMPLE_VARS = { name: 'Jane Doe', email: 'jane@example.com', date: 'April 9, 2026' }

function renderPreview(text) {
  return Object.entries(SAMPLE_VARS).reduce(
    (s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    text
  )
}

export default function SendEmail() {
  const [templates, setTemplates]         = useState([])
  const [users, setUsers]                 = useState([])
  const [selectedTemplate, setSelected]   = useState('')
  const [recipientType, setRecipientType] = useState('all')
  const [specificEmails, setSpecific]     = useState('')
  const [showPreview, setShowPreview]     = useState(false)
  const [sending, setSending]             = useState(false)
  const [result, setResult]               = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/templates/'),
      api.get('/api/email/users'),
    ]).then(([tmpl, usr]) => {
      setTemplates(tmpl.data)
      setUsers(usr.data)
    }).catch(() => toast.error('Failed to load data'))
  }, [])

  const template = templates.find((t) => t.id === selectedTemplate)

  const getRecipientCount = () => {
    if (recipientType === 'all') return users.length
    return specificEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean).length
  }

  const handleSend = async () => {
    if (!selectedTemplate) return toast.error('Please select a template')
    if (recipientType === 'specific' && !specificEmails.trim()) {
      return toast.error('Enter at least one email address')
    }

    const count = getRecipientCount()
    if (count === 0) return toast.error('No recipients found')

    setSending(true)
    setResult(null)
    try {
      const payload = {
        template_id: selectedTemplate,
        recipient_type: recipientType,
        ...(recipientType === 'specific' && {
          recipient_emails: specificEmails.split(',').map((e) => e.trim()).filter(Boolean),
        }),
      }
      const { data } = await api.post('/api/email/send', payload)
      setResult({ success: true, message: data.message, count: data.recipient_count })
      toast.success(`Sending to ${data.recipient_count} recipient(s)`)
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'Failed to send email'
      setResult({ success: false, message: msg })
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Send Email</h1>
        <p className="text-slate-500 text-sm mt-0.5">Choose a template and send to your users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Config */}
        <div className="lg:col-span-3 space-y-5">

          {/* Template picker */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Select Template
            </h2>
            <select
              className="input"
              value={selectedTemplate}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">— Choose a template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
            {template && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-0.5">Subject</p>
                <p className="text-sm font-medium text-slate-900">{template.subject}</p>
              </div>
            )}
          </div>

          {/* Recipient picker */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Choose Recipients
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { value: 'all', label: 'All Users', desc: `${users.length} users`, icon: Users },
                { value: 'specific', label: 'Specific Emails', desc: 'Enter manually', icon: UserCheck },
              ].map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setRecipientType(value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                    recipientType === value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${recipientType === value ? 'text-brand-600' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-sm font-medium ${recipientType === value ? 'text-brand-700' : 'text-slate-700'}`}>{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {recipientType === 'specific' && (
              <div>
                <label className="label">Email Addresses <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <textarea
                  className="input resize-none h-24 font-mono text-xs"
                  placeholder="john@example.com, jane@example.com"
                  value={specificEmails}
                  onChange={(e) => setSpecific(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Send button */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Send
              </h2>
              {selectedTemplate && (
                <p className="text-sm text-slate-500">
                  <strong className="text-slate-900">{getRecipientCount()}</strong> recipient{getRecipientCount() !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {result && (
              <div className={`flex items-start gap-3 p-3 rounded-lg mb-4 ${
                result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}>
                {result.success
                  ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                }
                <p className={`text-sm ${result.success ? 'text-emerald-700' : 'text-red-600'}`}>
                  {result.message}
                </p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !selectedTemplate}
              className="btn-primary w-full justify-center py-3"
            >
              {sending ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4" />Send Email Campaign</>
              )}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Emails are sent in the background. Check Logs for delivery status.
            </p>
          </div>
        </div>

        {/* Right — Preview */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden sticky top-8">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Email Preview</h3>
              {template && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  {showPreview ? <><EyeOff className="w-3 h-3" />Hide</> : <><Eye className="w-3 h-3" />Show</>}
                </button>
              )}
            </div>

            {!template ? (
              <div className="p-10 text-center">
                <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Select a template to preview</p>
              </div>
            ) : showPreview ? (
              <iframe
                key={template.id}
                srcDoc={renderPreview(template.body)}
                className="w-full h-96"
                sandbox="allow-same-origin"
                title="Email preview"
              />
            ) : (
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Subject</p>
                  <p className="text-sm text-slate-800">{renderPreview(template.subject)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Variables used</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(template.variables ?? []).map((v) => (
                      <span key={v} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(true)}
                  className="btn-secondary w-full justify-center text-xs py-2"
                >
                  <Eye className="w-3.5 h-3.5" />Render Preview
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

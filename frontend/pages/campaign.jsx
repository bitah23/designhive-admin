import { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Campaign() {
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/templates'), api.get('/users')])
      .then(([tRes, uRes]) => { setTemplates(tRes.data); setUsers(uRes.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleUser = (id) => setSelectedUsers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = (e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : []);
  const allSelected = users.length > 0 && selectedUsers.length === users.length;

  const handleSend = async () => {
    if (!selectedTemplate || selectedUsers.length === 0) {
      toast.error('Select a template and at least one user');
      return;
    }
    const conf = await Swal.fire({
      title: 'Send Campaign?',
      text: `This will send "${templates.find(t => t.id === selectedTemplate)?.title}" to ${selectedUsers.length} user(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Send',
      confirmButtonColor: '#FACC15',
      cancelButtonColor: '#374151',
      background: '#11131A',
      color: '#fff',
    });
    if (!conf.isConfirmed) return;

    setSending(true);
    setResults(null);
    try {
      const { data } = await api.post('/email/send', { template_id: selectedTemplate, user_ids: selectedUsers });
      setResults(data.results);
      const sent = data.results.filter(r => r.status === 'sent').length;
      const failed = data.results.filter(r => r.status === 'failed').length;
      failed === 0
        ? toast.success(`${sent} email(s) sent successfully`)
        : toast(`${sent} sent, ${failed} failed`, { icon: '⚠️' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="row g-3">
        <div className="col-lg-4"><div className="skeleton" style={{ height: 400 }} /></div>
        <div className="col-lg-8"><div className="skeleton" style={{ height: 400 }} /></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h4 className="fw-bold text-white mb-1">Campaign</h4>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Select a template and recipients, then send</p>
      </div>

      <div className="row g-3 mb-4">
        {/* Step 1 — Template */}
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100">
            <p className="label-upper mb-3">1 · Select Template</p>
            {templates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No templates found. Create one first.</p>
            ) : (
              <div className="d-flex flex-column gap-2" style={{ maxHeight: 480, overflowY: 'auto' }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className="text-start p-3 rounded-3 w-100"
                    style={{
                      background: selectedTemplate === t.id ? 'var(--gold)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedTemplate === t.id ? 'var(--gold)' : 'var(--border)'}`,
                      color: selectedTemplate === t.id ? '#000' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <p className="fw-semibold mb-1" style={{ fontSize: '0.88rem' }}>{t.title}</p>
                    <p className="mb-0 text-truncate" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{t.subject}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2 — Users */}
        <div className="col-lg-8">
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <p className="label-upper mb-0">2 · Select Recipients</p>
              <span className="badge-sent">{selectedUsers.length} selected</span>
            </div>
            <div style={{ maxHeight: 480, overflowY: 'auto' }}>
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 48 }}>
                      <input type="checkbox" className="form-check-input" checked={allSelected} onChange={toggleAll} />
                    </th>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="cursor-pointer" onClick={() => toggleUser(u.id)}
                      style={{ background: selectedUsers.includes(u.id) ? 'rgba(250,204,21,0.04)' : 'transparent' }}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="form-check-input" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} />
                      </td>
                      <td className="fw-semibold text-white">{u.name || '—'}</td>
                      <td className="text-gold">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Send Button */}
      <div className="d-flex justify-content-end">
        <button
          className="btn btn-primary d-flex align-items-center gap-2 px-5 py-3"
          style={{ borderRadius: 12, fontSize: '0.95rem' }}
          onClick={handleSend}
          disabled={sending || !selectedTemplate || selectedUsers.length === 0}
        >
          {sending
            ? <><span className="spinner-border spinner-border-sm" /> Sending...</>
            : <><Send size={17} /> Send to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}</>}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="glass-card p-4 mt-4">
          <h6 className="fw-bold text-white mb-4">Send Results</h6>
          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <div className="p-4 rounded-3 text-center" style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)' }}>
                <p className="fw-bold text-gold mb-1" style={{ fontSize: '2rem' }}>{results.filter(r => r.status === 'sent').length}</p>
                <p className="label-upper mb-0">Sent</p>
              </div>
            </div>
            <div className="col-sm-6">
              <div className="p-4 rounded-3 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <p className="fw-bold mb-1" style={{ fontSize: '2rem', color: '#ef4444' }}>{results.filter(r => r.status === 'failed').length}</p>
                <p className="label-upper mb-0">Failed</p>
              </div>
            </div>
          </div>
          <div className="d-flex flex-column gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div key={i} className="d-flex align-items-center justify-content-between px-3 py-2 rounded-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <span className="text-white small">{r.email}</span>
                <div className="d-flex align-items-center gap-2">
                  {r.error && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{r.error}</span>}
                  {r.status === 'sent'
                    ? <CheckCircle size={15} style={{ color: 'var(--gold)' }} />
                    : <XCircle size={15} style={{ color: '#ef4444' }} />}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-end">
            <button className="btn-secondary-dark px-4 py-2" style={{ fontSize: '0.85rem' }} onClick={() => setResults(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

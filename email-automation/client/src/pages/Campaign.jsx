import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Send, Users, FileText, CheckCircle2, AlertCircle, Loader2, FlaskConical, Play, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Campaign = () => {
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, usersRes] = await Promise.all([
          api.get('/templates'),
          api.get('/users'),
        ]);
        setTemplates(templatesRes.data);
        setUsers(usersRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setTimeout(() => setLoading(false), 200);
      }
    };
    fetchData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleUserSelect = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSend = async (isTest = false) => {
    if (!selectedTemplate || (!isTest && selectedUsers.length === 0)) {
      toast.error('Please select a template and recipients.');
      return;
    }

    const recipientCount = isTest ? 1 : selectedUsers.length;
    const result = await Swal.fire({
      title: 'Launch Campaign?',
      text: `Are you sure you want to send this ${isTest ? 'TEST ' : ''}campaign to ${recipientCount} recipient(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Launch!'
    });

    if (!result.isConfirmed) {
      return;
    }

    setSending(true);
    setSentCount(0);
    setResults(null);

    // Mock progress since real-time streaming is complex, 
    // but we can simulate the increment for better UX
    const progressInterval = setInterval(() => {
      setSentCount(prev => prev < selectedUsers.length ? prev + 1 : prev);
    }, 100);

    try {
      const response = await api.post('/email/send', {
        templateId: selectedTemplate,
        userIds: isTest ? [users[0].id] : selectedUsers // Logic for test or full send
      });
      clearInterval(progressInterval);
      setSentCount(selectedUsers.length);
      setResults(response.data.results);
      const successCount = response.data.results.filter(r => r.status === 'sent').length;
      const failCount = response.data.results.filter(r => r.status === 'failed').length;
      if (failCount === 0) {
        toast.success(`Campaign complete! ${successCount} emails delivered.`);
      } else {
        toast(`Campaign done: ${successCount} sent, ${failCount} failed.`, { icon: '⚠️' });
      }
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(`Dispatch Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Skeleton width="220px" height="40px" className="mb-4" />
        <div className="row g-4">
           <div className="col-lg-4"><div className="card border-0 shadow-sm p-4 bg-white"><Skeleton width="100%" height="300px" /></div></div>
           <div className="col-lg-8"><div className="card border-0 shadow-sm p-4 bg-white"><Skeleton width="100%" height="400px" /></div></div>
        </div>
      </div>
    );
  }

  const progressPercentage = selectedUsers.length > 0 ? (sentCount / selectedUsers.length) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
         <div>
            <h2 className="fw-bold m-0 text-dark ls-tight">Broadcast Engine</h2>
            <p className="text-muted small m-0">Define your scope, select your template, and launch.</p>
         </div>
         <button 
           className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2 fw-bold"
           onClick={() => handleSend(true)}
           disabled={sending || !selectedTemplate}
         >
            <FlaskConical size={18} /> SEND TEST TO ME
         </button>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100 bg-white" style={{ borderRadius: '24px' }}>
            <div className="card-body p-4">
              <h6 className="fw-bold mb-4 text-muted text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>1. Communication Matrix</h6>
              <div className="list-group list-group-flush rounded-4 overflow-hidden shadow-none border">
                {templates.map(t => (
                  <button
                    key={t.id}
                    className={`list-group-item list-group-item-action border-0 py-3 ${selectedTemplate === t.id ? 'bg-primary text-white' : ''}`}
                    onClick={() => setSelectedTemplate(t.id)}
                  >
                    <div className="fw-bold small">{t.title}</div>
                    <div className={`x-small ${selectedTemplate === t.id ? 'opacity-75' : 'text-muted'}`}>{t.subject}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0 bg-white px-2 py-2" style={{ borderRadius: '24px' }}>
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h6 className="fw-bold m-0 text-muted text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>2. Audience Scope</h6>
                <div className="badge bg-primary bg-opacity-10 text-primary pt-1.5 px-3">{selectedUsers.length} TARGETS</div>
              </div>

              <div className="table-responsive border rounded-4 bg-white shadow-none mb-3" style={{ maxHeight: '420px' }}>
                <table className="table table-hover mb-0 align-middle small">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th width="50" className="ps-4">
                        <input 
                          type="checkbox" className="form-check-input" 
                          onChange={handleSelectAll}
                          checked={selectedUsers.length === users.length && users.length > 0}
                        />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className={selectedUsers.includes(u.id) ? 'bg-primary bg-opacity-5' : ''}>
                        <td className="ps-4">
                          <input 
                            type="checkbox" className="form-check-input shadow-none" 
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => handleUserSelect(u.id)}
                          />
                        </td>
                        <td className="fw-bold">{u.name}</td>
                        <td className="text-secondary">{u.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {sending && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-4 p-4 bg-dark rounded-4 text-white shadow-lg"
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                   <div className="d-flex align-items-center gap-2">
                      <Loader2 size={18} className="animate-spin text-primary" />
                      <span className="fw-bold small">DISPATCHING CAMPAIGN...</span>
                   </div>
                   <span className="small opacity-75">{sentCount} / {selectedUsers.length} complete</span>
                </div>
                <div className="progress bg-white bg-opacity-10" style={{ height: '8px', borderRadius: '4px' }}>
                  <motion.div 
                    className="progress-bar bg-primary" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4 d-flex justify-content-between align-items-center">
             <div className="text-muted small">
                <Info size={14} className="me-1" /> Estimated time: ~{Math.ceil(selectedUsers.length / 5)}s
             </div>
             <button 
              className="btn btn-primary d-flex align-items-center gap-3 px-5 py-3 fw-bold shadow-lg border-0"
              style={{ borderRadius: '16px' }}
              disabled={sending || !selectedTemplate || selectedUsers.length === 0}
              onClick={() => handleSend(false)}
            >
              <Send size={20} /> LAUNCH BROADCAST
            </button>
          </div>
        </div>
      </div>

      {/* Results Recap */}
      <AnimatePresence>
        {results && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card border-0 shadow-lg bg-white overflow-hidden" 
            style={{ borderRadius: '28px' }}
          >
            <div className="card-body p-5">
              <div className="d-flex align-items-center gap-4 mb-5 pb-4 border-bottom">
                 <div className="bg-success p-3 rounded-circle shadow-lg text-white"><CheckCircle2 size={36} /></div>
                 <div>
                    <h3 className="fw-bold mb-0">Transmission Successful</h3>
                    <p className="text-muted m-0">The campaign has been fully processed by the worker node.</p>
                 </div>
              </div>
              <div className="row g-4">
                 <div className="col-sm-6">
                    <div className="p-4 bg-success bg-opacity-10 rounded-5 border border-success border-opacity-10 text-center">
                       <h2 className="fw-bold text-success display-5 mb-0">{results.filter(r => r.status === 'sent').length}</h2>
                       <small className="fw-bold text-success text-uppercase ls-wider">Delivered</small>
                    </div>
                 </div>
                 <div className="col-sm-6">
                    <div className="p-4 bg-danger bg-opacity-10 rounded-5 border border-danger border-opacity-10 text-center">
                       <h2 className="fw-bold text-danger display-5 mb-0">{results.filter(r => r.status === 'failed').length}</h2>
                       <small className="fw-bold text-danger text-uppercase ls-wider">Intercepted</small>
                    </div>
                 </div>
              </div>
              <div className="mt-5 text-center">
                 <button className="btn btn-light px-4 py-2 fw-bold text-muted rounded-3" onClick={() => setResults(null)}>Dismiss Report</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .x-small { font-size: 0.75rem; }
      `}</style>
    </motion.div>
  );
};

export default Campaign;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Eye, Mail, FlaskConical, Send, User, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TestPreview = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({ name: 'John Doe', email: 'john@designhive.com', date: new Date().toLocaleDateString() });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
      if (response.data.length > 0) {
        setSelectedTemplate(response.data[0]);
        renderPreview(response.data[0].body, variables);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const renderPreview = (body, vars) => {
    let rendered = body;
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, vars[key]);
    });
    setPreviewHtml(rendered);
  };

  const handleVariableChange = (key, value) => {
    const newVars = { ...variables, [key]: value };
    setVariables(newVars);
    if (selectedTemplate) {
      renderPreview(selectedTemplate.body, newVars);
    }
  };

  const handleTemplateSelect = (t) => {
    setSelectedTemplate(t);
    renderPreview(t.body, variables);
  };

  const handleSendTest = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    try {
      await api.post('/email/send', {
        templateId: selectedTemplate.id,
        userIds: [], 
        isTest: true,
        testData: variables
      });
      toast.success('Simulation payload dispatched to admin gateway.');
    } catch (err) {
      toast.error('Dispatch failed. Verify SMTP protocol status.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-2">
         <div className="skeleton bg-card rounded-3 mb-5" style={{ width: '220px', height: '40px' }}></div>
         <div className="row g-4">
            <div className="col-lg-4"><div className="glass-card p-4 h-100" style={{ height: '400px' }}></div></div>
            <div className="col-lg-8"><div className="glass-card p-4 h-100" style={{ height: '500px' }}></div></div>
         </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-end mb-5 mt-n1">
         <div>
            <h2 className="fw-bold m-0 text-white ls-tight">Neural Simulation Lab</h2>
            <p className="text-secondary small m-0 opacity-75">Execute signal simulations and validate payload visual integrity.</p>
         </div>
         <div className="d-flex gap-3">
            <button className="btn btn-darker border border-white border-opacity-5 px-4 py-2.5 fw-bold text-secondary hover-bg-white-5 d-flex align-items-center gap-2" onClick={() => handleVariableChange('date', new Date().toLocaleDateString())}>
               <RotateCcw size={16} /> RESET CORE
            </button>
            <button 
              className="btn btn-primary px-5 py-2.5 fw-bold shadow-gold d-flex align-items-center gap-2 border-0"
              onClick={handleSendTest}
              disabled={sending}
            >
               {sending ? <Loader2 size={18} className="animate-spin" /> : <FlaskConical size={18} />} SIMULATE TRACE
            </button>
         </div>
      </div>

      <div className="row g-4">
        {/* Settings Side */}
        <div className="col-lg-4">
          <div className="glass-card border-opacity-5 mb-4 p-1">
             <div className="card-body p-4">
                <h6 className="fw-bold mb-4 text-secondary text-uppercase ls-wider" style={{ fontSize: '0.65rem' }}>Select Signal Matrix</h6>
                <div className="input-group glass-bg rounded-3 border border-white border-opacity-5 px-1 mb-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                   <span className="input-group-text bg-transparent border-0 text-gold"><Mail size={16} /></span>
                   <select className="form-select bg-transparent border-0 shadow-none py-2.5 text-white small" value={selectedTemplate?.id} onChange={(e) => handleTemplateSelect(templates.find(t => t.id === e.target.value))}>
                      {templates.map(t => <option key={t.id} value={t.id} className="bg-darker">{t.title}</option>)}
                   </select>
                </div>

                <h6 className="fw-bold mb-3 text-secondary text-uppercase ls-wider" style={{ fontSize: '0.65rem' }}>Injection Variables</h6>
                <div className="d-flex flex-column gap-4">
                   {['name', 'email', 'date'].map(key => (
                      <div key={key}>
                         <label className="form-label small fw-bold text-secondary opacity-50 text-uppercase ls-tight mb-2 ps-1">{key}</label>
                         <input 
                           type="text" className="form-control bg-darker border border-white border-opacity-10 py-3 shadow-none text-white rounded-3 px-3" 
                           value={variables[key]} 
                           onChange={(e) => handleVariableChange(key, e.target.value)}
                         />
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="glass-card border-gold border-opacity-10 bg-gold bg-opacity-5 p-4" style={{ borderRadius: '24px' }}>
             <div className="d-flex align-items-center gap-3 mb-3">
                <CheckCircle2 size={24} className="text-gold opacity-80 shadow-gold" />
                <h6 className="fw-bold m-0 text-white ls-tight">Dynamic Synchronization</h6>
             </div>
             <p className="small m-0 text-secondary opacity-75 ls-tight leading-relaxed">
                Modifications to these injection nodes are instantly reflected in the visual trace, simulating the final production relay.
             </p>
          </div>
        </div>

        {/* Preview Side */}
        <div className="col-lg-8">
           <div className="glass-card border-opacity-5 h-100 overflow-hidden d-flex flex-column" style={{ minHeight: '600px' }}>
              <div className="card-header bg-transparent border-bottom border-white border-opacity-5 p-4 d-flex justify-content-between align-items-center">
                 <div className="d-flex align-items-center gap-3">
                    <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold"><Eye size={18} /></div>
                    <span className="fw-bold text-white ls-tight">VISUAL TRACE SIMULATION</span>
                 </div>
                 <div className="d-flex gap-2 opacity-30">
                    <div className="bg-white rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <div className="bg-white rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <div className="bg-white rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                 </div>
              </div>
              <div className="card-body p-4 p-md-5 bg-deep overflow-auto flex-grow-1 custom-scrollbar">
                 <div className="bg-white shadow-2xl mx-auto p-4 p-md-5 rounded-4 border-0" style={{ maxWidth: '600px', minHeight: '500px', color: '#1a202c' }}>
                    {selectedTemplate ? (
                       <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                       <div className="text-center py-5">
                          <Mail className="text-gold opacity-10 mb-3" size={80} />
                          <p className="text-secondary opacity-40 fw-bold">No signal matrix selected</p>
                       </div>
                    )}
                 </div>
              </div>
              <div className="card-footer bg-transparent border-top border-white border-opacity-5 p-4 text-center">
                 <p className="text-secondary m-0 small opacity-75 fw-medium">
                    <User size={14} className="me-2 text-gold opacity-80" /> ATOM_TARGET: <strong className="text-gold">{variables.name}</strong> • STATUS: <strong className="text-white">SIGNAL ESTABLISHED</strong>
                 </p>
              </div>
           </div>
        </div>
      </div>
      <style>{`
         .bg-darker { background-color: #0F172A; }
         .bg-deep { background-color: #050508; }
         .shadow-gold { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.2)); }
         .shadow-2xl { box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.8), 0 18px 36px -18px rgba(0, 0, 0, 0.5); }
         .ls-wider { letter-spacing: 0.1em; }
         .ls-tight { letter-spacing: -0.01em; }
         .animate-spin { animation: spin 1.5s linear infinite; }
         @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default TestPreview;

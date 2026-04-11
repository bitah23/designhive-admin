import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Eye, Mail, FlaskConical, Send, User, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TestPreview = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variables, setVariables] = useState({ name: 'John Doe', email: 'john@example.com', date: new Date().toLocaleDateString() });
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
      setLoading(false);
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
        userIds: [], // Special case for test send if backend supports it or just use a dummy
        isTest: true,
        testData: variables
      });
      toast.success('Test email successfully dispatched to your admin mailbox!');
    } catch (err) {
      toast.error('Failed to send test email. Check your SMTP settings.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center mt-5 p-5"><Loader2 className="animate-spin text-primary" size={48} /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
         <div>
            <h2 className="fw-bold m-0 lh-tight">Sandbox & Preview</h2>
            <p className="text-muted m-0 small">Simulate communication renders and validate your designs.</p>
         </div>
         <div className="d-flex gap-2">
            <button className="btn btn-white bg-white border shadow-sm px-3 fw-bold small d-flex align-items-center gap-2" onClick={() => handleVariableChange('date', new Date().toLocaleDateString())}>
               <RotateCcw size={16} /> Reset Vars
            </button>
            <button 
              className="btn btn-primary px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
              onClick={handleSendTest}
              disabled={sending}
            >
               {sending ? <Loader2 size={18} className="animate-spin" /> : <FlaskConical size={18} />} SEND TEST
            </button>
         </div>
      </div>

      <div className="row g-4">
        {/* Settings Side */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm bg-white mb-4" style={{ borderRadius: '24px' }}>
             <div className="card-body p-4">
                <h6 className="fw-bold mb-4 text-muted text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>Select Component</h6>
                <select className="form-select border-0 bg-light py-2 shadow-none mb-4" onChange={(e) => handleTemplateSelect(templates.find(t => t.id === e.target.value))}>
                   {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>

                <h6 className="fw-bold mb-3 text-muted text-uppercase ls-wide" style={{ fontSize: '0.75rem' }}>Live Variables</h6>
                <div className="d-flex flex-column gap-3">
                   {['name', 'email', 'date'].map(key => (
                      <div key={key}>
                         <label className="form-label small fw-bold text-muted text-capitalize mb-1">{key}</label>
                         <input 
                           type="text" className="form-control border-0 bg-light py-2 shadow-none" 
                           value={variables[key]} 
                           onChange={(e) => handleVariableChange(key, e.target.value)}
                         />
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="card border-0 shadow-sm bg-primary text-white p-4" style={{ borderRadius: '24px' }}>
             <div className="d-flex align-items-center gap-3 mb-3">
                <CheckCircle2 size={24} className="text-white opacity-75" />
                <h6 className="fw-bold m-0">Dynamic Sync</h6>
             </div>
             <p className="small m-0 text-white text-opacity-75">
                Changes to these variables are instantly reflected in the preview. This mimics the actual database injection process.
             </p>
          </div>
        </div>

        {/* Preview Side */}
        <div className="col-lg-8">
           <div className="card border-0 shadow-sm bg-white h-100 overflow-hidden" style={{ borderRadius: '24px' }}>
              <div className="card-header bg-white border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
                 <div className="d-flex align-items-center gap-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded text-primary"><Eye size={18} /></div>
                    <span className="fw-bold small">Live Simulation View</span>
                 </div>
                 <div className="d-flex gap-1">
                    <div className="bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <div className="bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <div className="bg-light rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                 </div>
              </div>
              <div className="card-body p-4 p-md-5 bg-light overflow-auto">
                 <div className="bg-white shadow-lg mx-auto p-4 p-md-5 rounded-4 border" style={{ maxWidth: '600px', minHeight: '400px' }}>
                    {selectedTemplate ? (
                       <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    ) : (
                       <div className="text-center py-5">
                          <Mail className="text-muted opacity-25 mb-3" size={64} />
                          <p className="text-muted fw-bold">No template selected</p>
                       </div>
                    )}
                 </div>
              </div>
              <div className="card-footer bg-white border-0 p-4 text-center">
                 <p className="text-muted m-0 small">
                    <User size={14} className="me-1 opacity-50" /> Target Simulation: <strong>{variables.name}</strong> • Status: <strong>Ready to Relay</strong>
                 </p>
              </div>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TestPreview;

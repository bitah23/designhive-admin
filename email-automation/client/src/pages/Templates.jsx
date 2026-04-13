import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Plus, Edit2, Trash2, Save, Info, Eye, X, Mail, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState({ title: '', subject: '', body: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      setTemplates(response.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const templateId = currentTemplate._id || currentTemplate.id;
      if (isEditing && templateId) {
        await api.put(`/templates/${templateId}`, currentTemplate);
      } else {
        await api.post('/templates', currentTemplate);
      }
      setShowModal(false);
      setCurrentTemplate({ title: '', subject: '', body: '' });
      fetchTemplates();
      toast.success(isEditing ? 'Logic updated!' : 'Logic initialized!');
    } catch (err) {
      toast.error('Failed to sync intelligence.');
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image'],
      ['clean']
    ]
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Purge Intelligence?',
      text: "This mapping will be permanently removed from the hive.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#161A23',
      confirmButtonText: 'Yes, Purge it!',
      background: '#11131A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/templates/${id}`);
        fetchTemplates();
        toast.success('Purged successfully');
      } catch (err) {
        toast.error('Failed to purge');
      }
    }
  };

  const openModal = (template = null) => {
    if (template) {
      setCurrentTemplate(template);
      setIsEditing(true);
    } else {
      setCurrentTemplate({ title: '', subject: '', body: '' });
      setIsEditing(false);
    }
    setShowModal(true);
  };

  const runPreview = (body) => {
    const rendered = body
      .replace(/{{name}}/g, '<strong style="color:#FACC15">John Doe</strong>')
      .replace(/{{email}}/g, '<em style="color:#D1D5DB">john@designhive.com</em>')
      .replace(/{{date}}/g, new Date().toLocaleDateString());
    setPreviewContent(rendered);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="animate-pulse p-2">
        <div className="d-flex justify-content-between mb-5">
          <div className="skeleton bg-card rounded-3" style={{ width: '220px', height: '40px' }}></div>
          <div className="skeleton bg-card rounded-3" style={{ width: '180px', height: '40px' }}></div>
        </div>
        <div className="row g-4">
          {[1, 2, 3].map(i => (
            <div className="col-md-4" key={i}>
              <div className="glass-card p-4" style={{ height: '220px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5 mt-n1">
        <div>
           <h2 className="fw-bold m-0 text-white ls-tight">Template Architect</h2>
           <p className="text-secondary small m-0 opacity-75">Construct neural mappings for automated responses.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center fw-bold px-4 py-2.5 shadow-gold border-0" onClick={() => openModal()}>
          <Plus size={18} className="me-2" /> NEW MAPPING
        </button>
      </div>

      <div className="row g-4">
        {templates.map((t) => (
          <div className="col-md-6 col-lg-4" key={t.id}>
            <div className="glass-card h-100 card-hover overflow-hidden border-opacity-5">
              <div className="card-body p-4 d-flex flex-column h-100">
                <div className="d-flex justify-content-between align-items-start mb-4">
                  <div className="overflow-hidden pe-2">
                    <h5 className="fw-bold text-white m-0 text-truncate ls-tight">{t.title}</h5>
                    <small className="text-muted text-truncate d-block opacity-50 mt-1">Subject: {t.subject}</small>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    <button className="btn btn-darker border border-white border-opacity-5 p-2 rounded-3 text-gold hover-bg-white-5" onClick={() => runPreview(t.body)} title="Simulate">
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-darker border border-white border-opacity-5 p-2 rounded-3 text-secondary hover-bg-white-5" onClick={() => openModal(t)} title="Modify">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-darker border border-white border-opacity-5 p-2 rounded-3 text-danger hover-bg-danger-10" onClick={() => handleDelete(t.id)} title="Purge">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bg-deep bg-opacity-50 p-3 rounded-4 border border-white border-opacity-5 pointer mt-auto" onClick={() => runPreview(t.body)}>
                   <div className="small text-secondary opacity-75 fs-xsmall line-clamp-3">
                      {t.body.replace(/<[^>]*>/g, '').substring(0, 120) || "Empty neural sequence..."}...
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
           <div className="col-12 text-center py-5 opacity-25">
              <FileText size={60} className="text-gold mb-3 mx-auto" />
              <p className="text-white">No mappings initialized in the hive.</p>
           </div>
        )}
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
      {showModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="modal show d-block bg-black bg-opacity-80 z-index-modal backdrop-blur-sm" 
          tabIndex="-1"
        >
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <motion.div 
               initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
               className="modal-content glass-card border-opacity-10 overflow-hidden shadow-2xl"
            >
              <div className="modal-header border-bottom border-white border-opacity-5 p-4 bg-transparent d-flex justify-content-between">
                <div className="d-flex align-items-center gap-3">
                   <div className="bg-gold bg-opacity-10 p-2 rounded-3 text-gold shadow-gold"><FileText size={20} /></div>
                   <h5 className="modal-title fw-bold text-white ls-tight">{isEditing ? 'UPDATE NEURAL MAPPING' : 'NEW NEURAL MAPPING'}</h5>
                </div>
                <button type="button" className="btn btn-darker border-0 p-2 rounded-circle text-muted" onClick={() => setShowModal(false)}><X size={20} /></button>
              </div>
              <div className="modal-body p-4 p-xl-5">
                <form onSubmit={handleSave}>
                  <div className="row g-4">
                     <div className="col-md-6">
                        <label className="form-label fw-bold small text-secondary text-uppercase ls-wider mb-2">Internal Title</label>
                        <input 
                          type="text" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3" 
                          value={currentTemplate.title} 
                          onChange={(e) => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                          required placeholder="e.g. CORE_WELCOME_SEQUENCE"
                        />
                     </div>
                     <div className="col-md-6">
                        <label className="form-label fw-bold small text-secondary text-uppercase ls-wider mb-2">Email Subject Line</label>
                        <input 
                          type="text" className="form-control bg-darker border border-white border-opacity-5 py-3 shadow-none text-white rounded-3" 
                          value={currentTemplate.subject} 
                          onChange={(e) => setCurrentTemplate({...currentTemplate, subject: e.target.value})}
                          required placeholder="e.g. Welcome to the hive"
                        />
                     </div>
                  </div>
                  
                  <div className="mt-4">
                     <label className="form-label fw-bold small text-secondary text-uppercase ls-wider mb-2">Neural Body Pattern</label>
                     <div className="bg-white rounded-3 overflow-hidden shadow-sm">
                        <ReactQuill 
                          theme="snow" 
                          value={currentTemplate.body} 
                          onChange={(val) => setCurrentTemplate({...currentTemplate, body: val})} 
                          modules={quillModules} 
                          placeholder="Initialize the email neural sequence here... use {{name}}, {{email}} for dynamic injection."
                        />
                     </div>
                  </div>

                  <div className="d-flex justify-content-end gap-3 mt-5 pt-4 border-top border-white border-opacity-5">
                    <button type="button" className="btn btn-darker border border-white border-opacity-10 px-4 fw-bold text-secondary" onClick={() => setShowModal(false)}>CANCEL</button>
                    <button type="submit" className="btn btn-primary d-flex align-items-center px-4 fw-bold shadow-gold border-0">
                      <Save size={18} className="me-2" /> {isEditing ? 'SYNC MODIFICATIONS' : 'INITIALIZE NEURAL LINK'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Preview Overlay */}
      <AnimatePresence>
         {showPreview && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-90 z-index-preview p-4 d-flex align-items-center justify-content-center backdrop-blur-md"
            >
               <div className="glass-card w-100 h-100 overflow-hidden d-flex flex-column border-opacity-10" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                  <div className="p-4 border-bottom border-white border-opacity-5 d-flex justify-content-between align-items-center">
                     <div className="d-flex align-items-center gap-3">
                        <div className="bg-gold p-2 shadow-gold rounded-3 text-black"><Mail size={20} /></div>
                        <h5 className="fw-bold m-0 text-white ls-tight">Neural Simulation Laboratory</h5>
                     </div>
                     <button className="btn btn-darker border-0 p-2 rounded-circle text-muted" onClick={() => setShowPreview(false)}><X size={20} /></button>
                  </div>
                  <div className="flex-grow-1 overflow-auto bg-deep p-4 p-md-5">
                     <div className="bg-white shadow-2xl rounded-4 p-4 p-md-5 mx-auto border-0" style={{ maxWidth: '600px', color: '#333' }}>
                        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                     </div>
                  </div>
                  <div className="p-3 border-top border-white border-opacity-5 bg-card text-center">
                     <p className="small text-secondary m-0 opacity-75">Visual trace confirmed for identity <strong>John Doe</strong>.</p>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <style>{`
        .bg-darker { background-color: #0F172A; }
        .bg-deep { background-color: #0A0A0F; }
        .hover-bg-white-5:hover { background-color: rgba(255,255,255,0.05); color: #fff; }
        .hover-bg-danger-10:hover { background-color: rgba(220,53,69,0.1); }
        .z-index-modal { z-index: 1050; }
        .z-index-preview { z-index: 2000; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); }
        .shadow-gold { box-shadow: 0 0 15px rgba(250, 204, 21, 0.2); }
        .ls-wider { letter-spacing: 0.08em; }
        .fs-xsmall { font-size: 0.7rem; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .ql-container { font-family: 'Poppins', sans-serif !important; font-size: 0.9rem !important; }
        .ql-toolbar { border-radius: 12px 12px 0 0 !important; border: none !important; background: #f8fafc !important; }
        .ql-container { border: none !important; min-height: 300px !important; }
        .backdrop-blur-sm { backdrop-filter: blur(4px); }
        .backdrop-blur-md { backdrop-filter: blur(12px); }
      `}</style>
    </motion.div>
  );
};

export default Templates;

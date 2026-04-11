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
      if (isEditing) {
        await api.put(`/templates/${currentTemplate.id}`, currentTemplate);
      } else {
        await api.post('/templates', currentTemplate);
      }
      setShowModal(false);
      setCurrentTemplate({ title: '', subject: '', body: '' });
      fetchTemplates();
      toast.success(isEditing ? 'Template updated!' : 'Template created!');
    } catch (err) {
      toast.error('Failed to save template. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this template deletion!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/templates/${id}`);
        fetchTemplates();
        toast.success('Template deleted successfully');
      } catch (err) {
        toast.error('Failed to delete template');
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
    // Simple placeholder replacement for preview
    const rendered = body
      .replace(/{{name}}/g, '<strong>John Doe</strong>')
      .replace(/{{email}}/g, '<em>john@example.com</em>')
      .replace(/{{date}}/g, new Date().toLocaleDateString());
    setPreviewContent(rendered);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="d-flex justify-content-between mb-4">
          <Skeleton width="200px" height="40px" />
          <Skeleton width="150px" height="40px" />
        </div>
        <div className="row g-4">
          {[1,2,3,4].map(i => (
            <div className="col-md-6" key={i}>
              <div className="card border-0 shadow-sm p-4 bg-white"><Skeleton width="100%" height="150px" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
           <h2 className="fw-bold m-0 text-dark">Template Architect</h2>
           <p className="text-muted small m-0">Create and manage dynamic HTML response templates.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center fw-bold px-4 py-2 shadow-sm rounded-3" onClick={() => openModal()}>
          <Plus size={18} className="me-2" /> NEW TEMPLATE
        </button>
      </div>

      <div className="row g-4">
        {templates.map((t) => (
          <div className="col-md-6 col-lg-4" key={t.id}>
            <div className="card border-0 shadow-sm h-100 bg-white card-hover overflow-hidden" style={{ borderRadius: '20px' }}>
              <div className="card-body p-4 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="overflow-hidden pe-2">
                    <h6 className="fw-bold text-dark m-0 text-truncate">{t.title}</h6>
                    <small className="text-muted text-truncate d-block">Sub: {t.subject}</small>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn btn-light-primary btn-sm p-2 rounded-3" onClick={() => runPreview(t.body)} title="Quick Preview">
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-light-secondary btn-sm p-2 rounded-3" onClick={() => openModal(t)} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-light-danger btn-sm p-2 rounded-3" onClick={() => handleDelete(t.id)} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="bg-light p-3 rounded-4 opacity-75 border-dashed pointer" onClick={() => runPreview(t.body)}>
                   <div className="small text-truncate text-muted">{t.body.replace(/<[^>]*>/g, '') || "No content..."}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 z-index-modal" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
              <div className="modal-header border-0 pb-0 pt-4 px-4 bg-white">
                <div className="d-flex align-items-center gap-3">
                   <div className="bg-primary bg-opacity-10 p-2 rounded-3 text-primary"><FileText size={20} /></div>
                   <h5 className="modal-title fw-bold">{isEditing ? 'UPDATE TEMPLATE' : 'NEW TEMPLATE'}</h5>
                </div>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4 pt-4">
                <form onSubmit={handleSave}>
                  <div className="row g-4">
                     <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted text-uppercase ls-wide">Internal Title</label>
                        <input 
                          type="text" className="form-control bg-light border-0 py-2.5 shadow-none rounded-3" 
                          value={currentTemplate.title} 
                          onChange={(e) => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                          required placeholder="e.g. Welcome Message"
                        />
                     </div>
                     <div className="col-md-6">
                        <label className="form-label fw-bold small text-muted text-uppercase ls-wide">Email Subject Line</label>
                        <input 
                          type="text" className="form-control bg-light border-0 py-2.5 shadow-none rounded-3" 
                          value={currentTemplate.subject} 
                          onChange={(e) => setCurrentTemplate({...currentTemplate, subject: e.target.value})}
                          required placeholder="Hi {{name}}, welcome!"
                        />
                     </div>
                     <div className="col-12">
                        <div className="d-flex justify-content-between align-items-end mb-2">
                           <label className="form-label fw-bold small text-muted text-uppercase ls-wide m-0">HTML Content</label>
                           <button type="button" className="btn btn-link text-primary p-0 text-decoration-none small fw-bold" onClick={() => runPreview(currentTemplate.body)}>
                              <Eye size={14} className="me-1" /> Live Preview
                           </button>
                        </div>
                        <div className="bg-white rounded-4 overflow-hidden border">
                          <ReactQuill 
                            theme="snow" 
                            value={currentTemplate.body} 
                            onChange={(val) => setCurrentTemplate({...currentTemplate, body: val})}
                            style={{ height: '350px', marginBottom: '45px' }}
                          />
                        </div>
                        <div className="mt-3 py-2 px-3 bg-primary bg-opacity-5 rounded-3 border border-primary border-opacity-10 d-flex gap-3 align-items-center">
                            <Info size={16} className="text-primary" />
                            <small className="text-primary fw-medium">Available Variables: <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{date}}"}</code></small>
                        </div>
                     </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 pt-4 border-top mt-4">
                    <button type="button" className="btn btn-light px-4 py-2 fw-bold text-muted" onClick={() => setShowModal(false)}>CANCEL</button>
                    <button type="submit" className="btn btn-primary px-5 py-2 fw-bold shadow">
                      {isEditing ? 'SYNC UPDATES' : 'INITIALIZE TEMPLATE'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Overlay */}
      <AnimatePresence>
         {showPreview && (
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 z-index-preview p-4 d-flex align-items-center justify-content-center"
            >
               <div className="bg-white w-100 h-100 rounded-5 shadow-2xl overflow-hidden d-flex flex-column" style={{ maxWidth: '900px', maxHeight: '90vh' }}>
                  <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                     <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary p-2 rounded-3"><Mail className="text-white" size={20} /></div>
                        <h5 className="fw-bold m-0">Communication Sandbox Preview</h5>
                     </div>
                     <button className="btn btn-light p-2 rounded-circle" onClick={() => setShowPreview(false)}><X size={20} /></button>
                  </div>
                  <div className="flex-grow-1 overflow-auto bg-light p-4 p-md-5">
                     <div className="bg-white shadow-sm rounded-4 p-4 p-md-5 mx-auto border" style={{ maxWidth: '600px' }}>
                        <div dangerouslySetInnerHTML={{ __html: previewContent }} />
                     </div>
                  </div>
                  <div className="p-3 border-top bg-light text-center">
                     <p className="small text-muted m-0">This is how the email will appear to <strong>John Doe</strong>.</p>
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <style>{`
        .btn-light-primary { background: #eef2ff; color: #6366f1; border: none; }
        .btn-light-primary:hover { background: #6366f1; color: white; }
        .btn-light-secondary { background: #f1f5f9; color: #64748b; border: none; }
        .btn-light-secondary:hover { background: #64748b; color: white; }
        .btn-light-danger { background: #fef2f2; color: #ef4444; border: none; }
        .btn-light-danger:hover { background: #ef4444; color: white; }
        .z-index-modal { z-index: 1050; }
        .z-index-preview { z-index: 2000; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
      `}</style>
    </motion.div>
  );
};

export default Templates;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { History, RefreshCw, Filter, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

DataTable.use(DT);

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [fullLogs, setFullLogs] = useState([]); // Keep original for filtering
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', dateRange: 'all' });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/logs');
      setFullLogs(response.data);
      applyFilters(response.data, filters);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const applyFilters = (data, f) => {
    let filtered = [...data];
    
    if (f.status !== 'all') {
      filtered = filtered.filter(l => l.status === f.status);
    }

    if (f.dateRange !== 'all') {
      const now = new Date();
      const today = new Date().setHours(0, 0, 0, 0);
      const yesterday = new Date(Date.now() - 86400000).setHours(0, 0, 0, 0);
      
      if (f.dateRange === 'today') {
        filtered = filtered.filter(l => new Date(l.timestamp).getTime() >= today);
      } else if (f.dateRange === 'yesterday') {
        filtered = filtered.filter(l => {
          const t = new Date(l.timestamp).getTime();
          return t >= yesterday && t < today;
        });
      }
    }

    setLogs(filtered);
  };

  const handleFilterChange = (key, val) => {
    const newFilters = { ...filters, [key]: val };
    setFilters(newFilters);
    applyFilters(fullLogs, newFilters);
  };

  const columns = [
    { title: 'Recipient', data: 'user_email', className: 'fw-bold py-3 ps-4' },
    { title: 'Template', data: 'email_templates.title', defaultContent: 'System', className: 'py-3' },
    { 
      title: 'Status', 
      data: 'status',
      render: (data) => `
        <span class="badge ${data === 'sent' ? 'bg-success-subtle text-success border-success-subtle' : 'bg-danger-subtle text-danger border-danger-subtle'} px-3 py-1.5 border">
          ${data.toUpperCase()}
        </span>
      `,
      className: 'py-3'
    },
    { 
      title: 'Dispatch Time', 
      data: 'timestamp', 
      render: (data) => new Date(data).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      className: 'text-muted small py-3'
    },
    {
      title: 'Diagnostics',
      data: 'error_message',
      render: (data) => data ? `<span class="text-danger small fw-bold">${data}</span>` : '<span class="text-muted opacity-50 small">--</span>',
      className: 'py-3'
    }
  ];

  if (loading) {
    return (
      <div className="animate-fade-in">
        <Skeleton width="180px" height="40px" className="mb-4" />
        <div className="card border-0 shadow-sm p-4 bg-white"><Skeleton width="100%" height="450px" /></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">Audit Intelligence</h2>
          <p className="text-muted small m-0">Detailed delivery reports and diagnostic logs.</p>
        </div>
        <button 
          className="btn btn-white bg-white border shadow-sm d-flex align-items-center gap-2 fw-bold px-3 py-2 rounded-3"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-primary'} /> RELOAD
        </button>
      </div>

      <div className="row g-3 mb-4">
         <div className="col-md-3">
            <div className="input-group input-group-sm">
               <span className="input-group-text bg-white border-end-0 text-muted ps-3"><Filter size={14} /></span>
               <select className="form-select border-start-0 shadow-none py-2" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="all">All Statuses</option>
                  <option value="sent">Successful only</option>
                  <option value="failed">Failures only</option>
               </select>
            </div>
         </div>
         <div className="col-md-3">
            <div className="input-group input-group-sm">
               <span className="input-group-text bg-white border-end-0 text-muted ps-3"><Calendar size={14} /></span>
               <select className="form-select border-start-0 shadow-none py-2" value={filters.dateRange} onChange={(e) => handleFilterChange('dateRange', e.target.value)}>
                  <option value="all">Any Lifetime</option>
                  <option value="today">Today Presence</option>
                  <option value="yesterday">Yesterday Logs</option>
               </select>
            </div>
         </div>
         <div className="col-md-6 d-flex align-items-center justify-content-end gap-3 px-3">
            <div className="small fw-bold text-success d-flex align-items-center gap-1">
               <CheckCircle2 size={12} /> {fullLogs.filter(l => l.status === 'sent').length} Sent
            </div>
            <div className="small fw-bold text-danger d-flex align-items-center gap-1">
               <XCircle size={12} /> {fullLogs.filter(l => l.status === 'failed').length} Failed
            </div>
         </div>
      </div>

      <div className="card border-0 shadow-sm bg-white overflow-hidden" style={{ borderRadius: '24px' }}>
        <div className="card-body p-4 pt-2">
          <DataTable
            data={logs}
            columns={columns}
            options={{
              pageLength: 10,
              order: [[3, 'desc']],
              responsive: true,
              dom: '<"d-flex justify-content-between align-items-center mb-4"f>rt<"d-flex justify-content-between align-items-center mt-4"ip>',
              language: {
                search: "",
                searchPlaceholder: "Instant lookup..."
              }
            }}
            className="table table-hover align-middle border-top"
          />
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};

export default Logs;

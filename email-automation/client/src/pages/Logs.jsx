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
  const [fullLogs, setFullLogs] = useState([]); 
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
    { title: 'Terminal Identity', data: 'user_email', className: 'fw-bold py-4 ps-4 text-white border-white border-opacity-5' },
    { title: 'Cluster Mapping', data: 'email_templates.title', defaultContent: 'System Direct', className: 'py-4 text-secondary border-white border-opacity-5' },
    { 
      title: 'Status', 
      data: 'status',
      render: (data) => `
        <span class="badge ${data === 'sent' ? 'bg-gold bg-opacity-10 text-gold border-gold border-opacity-20' : 'bg-danger bg-opacity-10 text-danger border-danger border-opacity-20'} px-3 py-2 rounded-pill border small fw-bold">
          ${data.toUpperCase()}
        </span>
      `,
      className: 'py-4 border-white border-opacity-5'
    },
    { 
      title: 'Execution Trace', 
      data: 'timestamp', 
      render: (data) => new Date(data).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      className: 'text-muted small py-4 border-white border-opacity-5'
    },
    {
      title: 'Diagnostic Output',
      data: 'error_message',
      render: (data) => data ? `<span class="text-danger fw-bold fs-xsmall">${data}</span>` : '<span class="text-secondary opacity-30 fs-xsmall">-- CLEAN TRACE --</span>',
      className: 'py-4 border-white border-opacity-5'
    }
  ];

  if (loading) {
    return (
      <div className="animate-pulse p-2">
        <div className="d-flex justify-content-between mb-5">
          <div className="skeleton bg-card rounded-3" style={{ width: '220px', height: '40px' }}></div>
          <div className="skeleton bg-card rounded-3" style={{ width: '150px', height: '40px' }}></div>
        </div>
        <div className="glass-card p-4">
          <div className="bg-section w-100 rounded-4" style={{ height: '450px' }}></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-5 mt-n1">
        <div>
          <h2 className="fw-bold m-0 text-white ls-tight">Audit Intelligence</h2>
          <p className="text-secondary small m-0 opacity-75">Detailed diagnostic traces and delivery analytics.</p>
        </div>
        <button 
          className="btn btn-darker border border-white border-opacity-5 d-flex align-items-center gap-2 fw-bold px-4 py-2.5 rounded-3 text-secondary hover-bg-white-5 shadow-sm"
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw size={16} className={`${loading ? 'animate-spin' : ''} text-gold`} /> RELOAD CORE
        </button>
      </div>

      <div className="row g-4 mb-5">
         <div className="col-md-3">
            <div className="input-group glass-bg rounded-3 border border-white border-opacity-5 px-1 px-md-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
               <span className="input-group-text bg-transparent border-0 text-gold"><Filter size={15} /></span>
               <select className="form-select bg-transparent border-0 shadow-none py-2.5 text-secondary small" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <option value="all">ALL FREQUENCIES</option>
                  <option value="sent">SENT ONLY</option>
                  <option value="failed">FAILED ONLY</option>
               </select>
            </div>
         </div>
         <div className="col-md-3">
            <div className="input-group glass-bg rounded-3 border border-white border-opacity-5 px-1 px-md-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
               <span className="input-group-text bg-transparent border-0 text-gold"><Calendar size={15} /></span>
               <select className="form-select bg-transparent border-0 shadow-none py-2.5 text-secondary small" value={filters.dateRange} onChange={(e) => handleFilterChange('dateRange', e.target.value)}>
                  <option value="all">ANY TIMEWINDOW</option>
                  <option value="today">LAST 24 HOURS</option>
                  <option value="yesterday">PRECEDING 24H</option>
               </select>
            </div>
         </div>
         <div className="col-md-6 d-flex align-items-center justify-content-end gap-4 px-3">
            <div className="small fw-bold text-gold d-flex align-items-center gap-2 glow-success">
               <div className="p-1 bg-gold bg-opacity-20 rounded-circle"><CheckCircle2 size={12} /></div>
               {fullLogs.filter(l => l.status === 'sent').length} TRANSMITTED
            </div>
            <div className="small fw-bold text-danger d-flex align-items-center gap-2 glow-danger">
               <div className="p-1 bg-danger bg-opacity-20 rounded-circle"><XCircle size={12} /></div>
               {fullLogs.filter(l => l.status === 'failed').length} BLOCKED
            </div>
         </div>
      </div>

      <div className="glass-card p-0 overflow-hidden border-opacity-5">
        <div className="card-body p-4 pt-3">
          <DataTable
            data={logs}
            columns={columns}
            options={{
              pageLength: 10,
              order: [[3, 'desc']],
              responsive: true,
              dom: '<"d-flex justify-content-between align-items-center mb-4 pb-2"f>rt<"d-flex justify-content-between align-items-center mt-4 pt-2 border-top border-white border-opacity-5"ip>',
              language: {
                search: "",
                searchPlaceholder: "Instant lookup...",
                lengthMenu: "_MENU_ entries per cluster",
                info: "Tracking _START_ to _END_ of _TOTAL_ execution events"
              }
            }}
            className="table align-middle"
          />
        </div>
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .bg-darker { background-color: #0F172A; }
        .fs-xsmall { font-size: 0.65rem; }
        .glow-success { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.4)); }
        .glow-danger { filter: drop-shadow(0 0 5px rgba(248, 113, 113, 0.4)); }
        
        .dataTables_filter input { 
          background: #0F172A !important; 
          border: 1px solid rgba(255,255,255,0.05) !important; 
          color: white !important; 
          border-radius: 10px !important;
          padding: 8px 15px !important;
          font-size: 0.85rem !important;
          width: 300px !important;
        }
        .dataTables_info, .dataTables_paginate { color: #9CA3AF !important; font-size: 0.8rem !important; }
        .paginate_button { background: transparent !important; border: none !important; color: #9CA3AF !important; }
        .paginate_button.current { background: #FACC15 !important; color: #000 !important; border-radius: 8px !important; }
      `}</style>
    </motion.div>
  );
};

export default Logs;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import { Users as UsersIcon, Search, Mail, Filter, Download, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

DataTable.use(DT);

const Skeleton = ({ width, height, className }) => (
  <div className={`bg-light animate-pulse ${className}`} style={{ width, height, borderRadius: '8px' }}></div>
);

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const columns = [
    { 
      title: 'Operational Identity', 
      data: 'name', 
      className: 'fw-bold py-4 text-white ps-4 border-white border-opacity-5' 
    },
    { 
      title: 'Neural Address', 
      data: 'email', 
      render: (data) => `<span class="text-gold fw-medium">${data}</span>`,
      className: 'py-4 border-white border-opacity-5' 
    },
    { 
      title: 'Identification Timestamp', 
      data: 'created_at', 
      render: (data) => new Date(data).toLocaleDateString([], { dateStyle: 'medium' }),
      className: 'text-secondary small py-4 border-white border-opacity-5' 
    },
    {
      title: 'Status',
      data: null,
      render: () => '<span class="badge bg-gold bg-opacity-10 text-gold border border-gold border-opacity-20 px-3 py-2 rounded-pill small fw-bold">ACTIVE</span>',
      className: 'py-4 text-center border-white border-opacity-5'
    }
  ];

  if (loading) {
    return (
      <div className="animate-pulse p-2">
        <div className="d-flex justify-content-between mb-5">
          <div className="skeleton bg-card rounded-3" style={{ width: '220px', height: '40px' }}></div>
          <div className="skeleton bg-card rounded-3" style={{ width: '180px', height: '40px' }}></div>
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
          <h2 className="fw-bold m-0 text-white ls-tight">User Registry</h2>
          <p className="text-secondary small m-0 opacity-75">Synchronized transmission targets across the hive.</p>
        </div>
        <div className="d-flex gap-3">
           <button className="btn btn-darker border border-white border-opacity-5 px-3 fw-bold small d-flex align-items-center gap-2 text-secondary hover-bg-white-5" onClick={() => {
              const csv = ['Name,Email,Joined'].concat(users.map(u => `${u.name},${u.email},${new Date(u.created_at).toLocaleDateString()}`)).join('\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = 'users.csv'; a.click();
              toast.success('Manifest exported as CSV!');
            }}>
               <Download size={16} /> EXPORT MANIFEST
            </button>
           <button 
             className="btn btn-primary px-4 py-2.5 shadow-gold d-flex align-items-center gap-2 border-0"
             onClick={() => window.location.href = '/admin/campaign'}
           >
              <Mail size={16} /> NEW CLUSTER
           </button>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden border-opacity-5">
        <div className="card-body p-4 pt-2">
          <DataTable
            data={users}
            columns={columns}
            options={{
              pageLength: 10,
              responsive: true,
              dom: '<"d-flex justify-content-between align-items-center mb-4 pb-2"f>rt<"d-flex justify-content-between align-items-center mt-4 pt-2 border-top border-white border-opacity-5"ip>',
              language: {
                search: "",
                searchPlaceholder: "Identify user...",
                info: "Tracking _START_ to _END_ of _TOTAL_ identities",
                lengthMenu: "_MENU_ entries per page"
              }
            }}
            className="table align-middle"
          />
        </div>
      </div>

      <div className="mt-5 p-4 rounded-4 bg-gold bg-opacity-5 border border-gold border-opacity-10">
        <div className="d-flex align-items-center gap-3">
           <div className="bg-gold p-2 rounded-3 text-black">
              <Plus size={20} />
           </div>
           <div>
              <p className="fw-bold m-0 text-white small ls-tight">Identity Management Notice</p>
              <p className="text-secondary small m-0 opacity-75">Individual identification records are generated automatically via the AI Core engine.</p>
           </div>
        </div>
      </div>

      <style>{`
        .bg-darker { background-color: #0F172A; }
        .hover-bg-white-5:hover { background-color: rgba(255,255,255,0.05); color: #fff; }
        .dataTables_filter input { 
          background: #0F172A !important; 
          border: 1px solid rgba(255,255,255,0.05) !important; 
          color: white !important; 
          border-radius: 10px !important;
          padding: 8px 15px !important;
          font-size: 0.85rem !important;
          width: 300px !important;
        }
        .dataTables_info, .dataTables_paginate {
          color: #9CA3AF !important;
          font-size: 0.8rem !important;
        }
        .paginate_button { background: transparent !important; border: none !important; color: #9CA3AF !important; }
        .paginate_button.current { background: #FACC15 !important; color: #000 !important; border-radius: 8px !important; }
      `}</style>
    </motion.div>
  );
};

export default Users;

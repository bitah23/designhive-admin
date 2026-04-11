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
      title: 'Full Name', 
      data: 'name', 
      className: 'fw-bold py-3 ps-4' 
    },
    { 
      title: 'Email Address', 
      data: 'email', 
      render: (data) => `<span class="text-primary fw-medium">${data}</span>`,
      className: 'py-3' 
    },
    { 
      title: 'Joined Date', 
      data: 'created_at', 
      render: (data) => new Date(data).toLocaleDateString([], { dateStyle: 'medium' }),
      className: 'text-muted small py-3' 
    },
    {
      title: 'Status',
      data: null,
      defaultContent: '<span class="badge bg-success-subtle text-success border border-success-subtle">Active</span>',
      className: 'py-3 text-center'
    }
  ];

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="d-flex justify-content-between mb-4">
          <Skeleton width="220px" height="40px" />
          <Skeleton width="180px" height="40px" />
        </div>
        <div className="card border-0 shadow-sm p-4 bg-white">
          <Skeleton width="100%" height="450px" />
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">User Profiles</h2>
          <p className="text-muted small m-0">Synchronized with Design Hive master database.</p>
        </div>
        <div className="d-flex gap-2">
           <button className="btn btn-white bg-white border shadow-sm px-3 fw-bold small d-flex align-items-center gap-2" onClick={() => {
              const csv = ['Name,Email,Joined'].concat(users.map(u => `${u.name},${u.email},${new Date(u.created_at).toLocaleDateString()}`)).join('\n');
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = 'users.csv'; a.click();
              toast.success('Users exported as CSV!');
            }}>
               <Download size={16} /> Export CSV
            </button>
           <button 
             className="btn btn-primary shadow-sm px-4 fw-bold small d-flex align-items-center gap-2"
             onClick={() => window.location.href = '/admin/campaign'}
           >
              <Mail size={16} /> New Campaign
           </button>
        </div>
      </div>

      <div className="card border-0 shadow-sm bg-white overflow-hidden" style={{ borderRadius: '24px' }}>
        <div className="card-body p-4 pt-2">
          <DataTable
            data={users}
            columns={columns}
            options={{
              pageLength: 10,
              responsive: true,
              dom: '<"d-flex justify-content-between align-items-center mb-4"lf>rt<"d-flex justify-content-between align-items-center mt-4"ip>',
              language: {
                search: "",
                searchPlaceholder: "Search users..."
              }
            }}
            className="table table-hover align-middle border-top"
          />
        </div>
      </div>

      <div className="mt-4 p-4 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10">
        <div className="d-flex align-items-center gap-3">
           <div className="bg-primary p-2 rounded-3">
              <Plus className="text-white" size={20} />
           </div>
           <div>
              <p className="fw-bold m-0 p-0 fs-6">Looking for manual management?</p>
              <p className="text-muted small m-0">Individual user creation is handled in the main Design Hive admin portal.</p>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Users;

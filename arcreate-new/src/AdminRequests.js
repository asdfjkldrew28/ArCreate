// AdminRequests.js - For admin to approve/reject material requests AND task requests
// Renamed from AdminMaterialRequests.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './AdminRequests.css';

const API_URL = 'http://localhost:5000/api';

const AdminRequests = ({ username, fullName, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('materials'); // 'materials' or 'tasks'
  const [materialRequests, setMaterialRequests] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [filteredMaterialRequests, setFilteredMaterialRequests] = useState([]);
  const [filteredTaskRequests, setFilteredTaskRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    material: { pending: 0, approved: 0, rejected: 0 },
    tasks: { pending: 0, approved: 0, rejected: 0 }
  });

  const statusOptions = [
    { value: 'pending', label: '⏳ Pending', color: '#f59e0b' },
    { value: 'approved', label: '✅ Approved', color: '#10b981' },
    { value: 'rejected', label: '❌ Rejected', color: '#ef4444' }
  ];

  const priorityOptions = [
    { value: 'low', label: '🟢 Low', color: '#10b981' },
    { value: 'medium', label: '🟡 Medium', color: '#f59e0b' },
    { value: 'high', label: '🔴 High', color: '#ef4444' },
    { value: 'urgent', label: '⚡ Urgent', color: '#dc2626' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterMaterialRequests();
  }, [materialRequests, statusFilter, searchTerm]);

  useEffect(() => {
    filterTaskRequests();
  }, [taskRequests, statusFilter, searchTerm]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch material requests
      const materialResponse = await fetch(`${API_URL}/material-requests/all`);
      const materialData = await materialResponse.json();
      setMaterialRequests(materialData.requests || []);
      calculateMaterialStats(materialData.requests || []);

      // Fetch task requests
      const taskResponse = await fetch(`${API_URL}/task-requests/all`);
      const taskData = await taskResponse.json();
      setTaskRequests(taskData.requests || []);
      calculateTaskStats(taskData.requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMaterialStats = (requestsList) => {
    setStats(prev => ({
      ...prev,
      material: {
        pending: requestsList.filter(r => r.status === 'pending').length,
        approved: requestsList.filter(r => r.status === 'approved').length,
        rejected: requestsList.filter(r => r.status === 'rejected').length
      }
    }));
  };

  const calculateTaskStats = (requestsList) => {
    setStats(prev => ({
      ...prev,
      tasks: {
        pending: requestsList.filter(r => r.status === 'pending').length,
        approved: requestsList.filter(r => r.status === 'approved').length,
        rejected: requestsList.filter(r => r.status === 'rejected').length
      }
    }));
  };

  const filterMaterialRequests = () => {
    let filtered = [...materialRequests];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.foreman_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredMaterialRequests(filtered);
  };

  const filterTaskRequests = () => {
    let filtered = [...taskRequests];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.request_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.foreman_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredTaskRequests(filtered);
  };

  const handleProcessMaterialRequest = async (requestId, action) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    const isApproving = action === 'approve';
    
    const result = await Swal.fire({
      title: `${isApproving ? 'Approve' : 'Reject'} Material Request?`,
      html: `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 15px; color: ${isApproving ? '#10b981' : '#ef4444'};">
            <i class="fas fa-${isApproving ? 'check-circle' : 'times-circle'}"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Are you sure you want to <strong>${actionText}</strong> this material request?
          </p>
          ${isApproving ? 
            '<p style="color: #f59e0b; font-size: 0.9rem;">Approving will automatically deduct the requested quantity from inventory.</p>' : 
            '<p style="color: #666; font-size: 0.9rem;">Rejected requests will be marked as rejected.</p>'
          }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isApproving ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Processing...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await fetch(`${API_URL}/material-requests/${requestId}/process`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, admin_username: username })
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: data.message,
            timer: 2000
          });
          fetchAllData();
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || `Failed to ${actionText} request`
        });
      }
    }
  };

  const handleProcessTaskRequest = async (requestId, action) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    const isApproving = action === 'approve';
    
    let rejectionReason = '';
    if (!isApproving) {
      const { value: reason } = await Swal.fire({
        title: 'Rejection Reason',
        input: 'textarea',
        inputLabel: 'Please provide a reason for rejecting this task request',
        inputPlaceholder: 'Enter rejection reason...',
        inputAttributes: {
          'aria-label': 'Rejection reason'
        },
        showCancelButton: true,
        confirmButtonText: 'Reject',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancel'
      });
      
      if (reason === undefined) return; // User cancelled
      rejectionReason = reason;
    }
    
    const result = await Swal.fire({
      title: `${isApproving ? 'Approve' : 'Reject'} Task Request?`,
      html: `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 15px; color: ${isApproving ? '#10b981' : '#ef4444'};">
            <i class="fas fa-${isApproving ? 'check-circle' : 'times-circle'}"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Are you sure you want to <strong>${actionText}</strong> this task request?
          </p>
          ${isApproving ? 
            '<p style="color: #10b981; font-size: 0.9rem;">Approving will create a new task for the foreman.</p>' : 
            '<p style="color: #ef4444; font-size: 0.9rem;">Rejected tasks will be marked as rejected.</p>'
          }
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: isApproving ? '#10b981' : '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Processing...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await fetch(`${API_URL}/task-requests/${requestId}/process`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action, 
            admin_username: username,
            rejection_reason: rejectionReason 
          })
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: data.message,
            timer: 2000
          });
          fetchAllData();
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || `Failed to ${actionText} request`
        });
      }
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('fullName');
        localStorage.removeItem('userId');
        onLogout();
        navigate('/login');
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: '🟢 Low',
      medium: '🟡 Medium',
      high: '🔴 High',
      urgent: '⚡ Urgent'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('pending');
  };

  const currentRequests = activeTab === 'materials' ? filteredMaterialRequests : filteredTaskRequests;
  const currentStats = activeTab === 'materials' ? stats.material : stats.tasks;

  return (
    <div className="admin-requests-container">
      <div className="admin-requests-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div>
              <h1>Requests Management</h1>
              <p className="header-subtitle">Approve or reject material and task requests from foremen</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('materials');
              clearFilters();
            }}
          >
            <i className="fas fa-box"></i> Material Requests
            {stats.material.pending > 0 && (
              <span className="tab-badge">{stats.material.pending}</span>
            )}
          </button>
          <button 
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('tasks');
              clearFilters();
            }}
          >
            <i className="fas fa-tasks"></i> Task Requests
            {stats.tasks.pending > 0 && (
              <span className="tab-badge">{stats.tasks.pending}</span>
            )}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{currentStats.pending}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>

          <div className="stat-card approved">
            <div className="stat-icon approved">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{currentStats.approved}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>

          <div className="stat-card rejected">
            <div className="stat-icon rejected">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{currentStats.rejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder={activeTab === 'materials' 
                ? "Search by request #, project, material, or foreman..." 
                : "Search by request #, project, task, foreman, or assigned worker..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="pending">Pending Requests</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Requests</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== 'pending') && (
            <button 
              className="btn btn-secondary clear-btn"
              onClick={clearFilters}
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="loading-spinner">Loading requests...</div>
        ) : (
          <div className="requests-list">
            {currentRequests.length > 0 ? (
              currentRequests.map(request => (
                <div key={request._id} className="request-card">
                  <div className="request-header">
                    <div>
                      <div className="request-number">{request.request_number || `REQ-${request._id.toString().slice(-8)}`}</div>
                      <h3 className="project-name">{request.project_name}</h3>
                      <div className="request-meta">
                        <span className="foreman-name">
                          <i className="fas fa-user"></i> {request.foreman_name}
                        </span>
                        <span className="request-date">
                          <i className="fas fa-calendar"></i> {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span 
                      className={`priority-badge`}
                      style={{ backgroundColor: `${getPriorityColor(request.priority)}20`, color: getPriorityColor(request.priority) }}
                    >
                      {getPriorityLabel(request.priority)}
                    </span>
                  </div>

                  {/* Material Request Details */}
                  {activeTab === 'materials' && (
                    <div className="request-details">
                      <div className="detail-item">
                        <strong>Material:</strong> {request.material_name}
                      </div>
                      <div className="detail-item">
                        <strong>Quantity:</strong> {request.quantity} {request.unit}
                      </div>
                      <div className="detail-item">
                        <strong>Required by:</strong> {new Date(request.required_by).toLocaleDateString()}
                      </div>
                      <div className="detail-item full-width">
                        <strong>Purpose:</strong> {request.purpose}
                      </div>
                      {request.notes && (
                        <div className="detail-item full-width">
                          <strong>Notes:</strong> {request.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Request Details */}
                  {activeTab === 'tasks' && (
                    <div className="request-details">
                      <div className="detail-item">
                        <strong>Task:</strong> {request.task_name}
                      </div>
                      <div className="detail-item">
                        <strong>Assigned To:</strong> {request.assigned_to_name || 'Not specified'}
                      </div>
                      <div className="detail-item">
                        <strong>Due Date:</strong> {new Date(request.due_date).toLocaleDateString()}
                      </div>
                      <div className="detail-item full-width">
                        <strong>Description:</strong> {request.description}
                      </div>
                      {request.notes && (
                        <div className="detail-item full-width">
                          <strong>Notes:</strong> {request.notes}
                        </div>
                      )}
                      {request.rejection_reason && request.status === 'rejected' && (
                        <div className="detail-item full-width rejection-reason">
                          <strong>Rejection Reason:</strong> {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="request-status">
                    <span className={`status-badge status-${request.status}`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>

                  {request.status === 'pending' && (
                    <div className="request-actions">
                      <button 
                        className="btn btn-success"
                        onClick={() => activeTab === 'materials' 
                          ? handleProcessMaterialRequest(request._id, 'approve')
                          : handleProcessTaskRequest(request._id, 'approve')
                        }
                      >
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => activeTab === 'materials'
                          ? handleProcessMaterialRequest(request._id, 'reject')
                          : handleProcessTaskRequest(request._id, 'reject')
                        }
                      >
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h3>No Requests Found</h3>
                <p>
                  {searchTerm || statusFilter !== 'pending'
                    ? 'No requests match your filters.'
                    : `No pending ${activeTab === 'materials' ? 'material' : 'task'} requests to review.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequests;
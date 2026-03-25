// MaterialRequests.js - Updated for admin approval workflow

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import './MaterialRequests.css';

const API_URL = 'http://localhost:5000/api';

// Add this function to clear notifications for material requests
const clearMaterialRequestsNotifications = () => {
  // Get notifications from localStorage
  const savedNotifications = localStorage.getItem('user_notifications');
  if (savedNotifications) {
    let notifications = JSON.parse(savedNotifications);
    
    // Remove any material request notifications
    const updatedNotifications = notifications.filter(
      n => n.id !== 'pending-material-requests'
    );
    
    // Save back to localStorage
    localStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));
    
    // Also update seen notifications
    const seenNotifications = localStorage.getItem('notifications_seen');
    if (seenNotifications) {
      let seen = JSON.parse(seenNotifications);
      seen = seen.filter(id => id !== 'pending-material-requests');
      localStorage.setItem('notifications_seen', JSON.stringify(seen));
    }
  }
};

const MaterialRequests = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromUrl = queryParams.get('project_id');
  const materialIdFromUrl = queryParams.get('material_id');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromUrl || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalMaterials: 0
  });

  // Form state for new request
  const [showForm, setShowForm] = useState(false);
  const [showClearHistory, setShowClearHistory] = useState(false);
  const [formData, setFormData] = useState({
    project_id: projectIdFromUrl || '',
    material_id: materialIdFromUrl || '',
    quantity: '',
    unit: 'pcs',
    priority: 'medium',
    required_by: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
    purpose: '',
    notes: ''
  });

  // State for availability check
  const [availabilityCheck, setAvailabilityCheck] = useState({
    checking: false,
    isAvailable: null,
    availableQuantity: null,
    materialName: '',
    unit: ''
  });

  const priorityOptions = [
    { value: 'low', label: '🟢 Low', color: '#10b981' },
    { value: 'medium', label: '🟡 Medium', color: '#f59e0b' },
    { value: 'high', label: '🔴 High', color: '#ef4444' },
    { value: 'urgent', label: '⚡ Urgent', color: '#dc2626' }
  ];

  const statusOptions = [
    { value: 'pending', label: '⏳ Pending', color: '#f59e0b' },
    { value: 'approved', label: '✅ Approved', color: '#10b981' },
    { value: 'rejected', label: '❌ Rejected', color: '#ef4444' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch projects assigned to this foreman
      const projectsResponse = await fetch(`${API_URL}/projects/foreman/${userId}`);
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);
      
      // Fetch all available materials
      const materialsResponse = await fetch(`${API_URL}/materials`);
      const materialsData = await materialsResponse.json();
      const availableMaterials = (materialsData.materials || [])
        .filter(m => m.status === 'available' && !m.deleted)
        .map(m => ({
          ...m,
          displayName: `${m.material_name} (${m.quantity} ${m.unit} available)`
        }));
      setMaterials(availableMaterials);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load data'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const userId = localStorage.getItem('userId');
      let url = `${API_URL}/material-requests/foreman/${userId}`;
      
      if (selectedProject !== 'all') {
        url += `?project_id=${selectedProject}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      let filteredRequests = data.requests || [];
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredRequests = filteredRequests.filter(r => r.status === statusFilter);
      }
      
      setRequests(filteredRequests);
      calculateStats(filteredRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  useEffect(() => {
    // Clear notifications when component mounts (user viewed the material requests page)
    clearMaterialRequestsNotifications();
    
    // Also update last viewed timestamp for material requests
    const updateLastViewed = async () => {
      try {
        const userId = localStorage.getItem('userId');
        await fetch(`${API_URL}/material-requests/update-last-viewed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foreman_id: userId })
        });
      } catch (error) {
        console.error('Error updating last viewed:', error);
      }
    };
    
    // Mark processed requests as viewed
    const markProcessedAsViewed = async () => {
      try {
        const userId = localStorage.getItem('userId');
        await fetch(`${API_URL}/material-requests/mark-processed-viewed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foreman_id: userId })
        });
      } catch (error) {
        console.error('Error marking processed requests as viewed:', error);
      }
    };
    
    updateLastViewed();
    markProcessedAsViewed();
    
    // Fetch data as before
    fetchData();
  }, []); // Empty dependency array - runs once when component mounts

  useEffect(() => {
    fetchRequests();
  }, [selectedProject, statusFilter]);

  const calculateStats = (requestsList) => {
    const pending = requestsList.filter(r => r.status === 'pending').length;
    const approved = requestsList.filter(r => r.status === 'approved').length;
    const rejected = requestsList.filter(r => r.status === 'rejected').length;
    
    setStats({
      pendingRequests: pending,
      approvedRequests: approved,
      rejectedRequests: rejected,
      totalMaterials: materials.length
    });
  };

  // Check material availability in real-time
  const checkAvailability = async (materialId, quantity) => {
    if (!materialId || !quantity || quantity <= 0) {
      setAvailabilityCheck({
        checking: false,
        isAvailable: null,
        availableQuantity: null,
        materialName: '',
        unit: ''
      });
      return;
    }

    setAvailabilityCheck(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch(`${API_URL}/material-requests/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, quantity: parseFloat(quantity) })
      });

      const data = await response.json();

      if (data.success) {
        setAvailabilityCheck({
          checking: false,
          isAvailable: data.isAvailable,
          availableQuantity: data.availableQuantity,
          materialName: data.material_name,
          unit: data.unit
        });
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityCheck({
        checking: false,
        isAvailable: null,
        availableQuantity: null,
        materialName: '',
        unit: ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'material_id') {
      const selectedMaterial = materials.find(m => m._id === value);
      if (selectedMaterial) {
        setFormData(prev => ({ 
          ...prev, 
          material_id: value,
          unit: selectedMaterial.unit
        }));
        
        if (formData.quantity && parseFloat(formData.quantity) > 0) {
          checkAvailability(value, formData.quantity);
        }
      }
    } 
    else if (name === 'quantity') {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (formData.material_id && value && parseFloat(value) > 0) {
        checkAvailability(formData.material_id, value);
      }
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    if (!formData.material_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Material',
        text: 'Please select a material'
      });
      return;
    }

    const requestedQuantity = parseFloat(formData.quantity);
    if (!requestedQuantity || requestedQuantity <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Please enter a valid quantity greater than 0'
      });
      return;
    }

    // Check if enough stock is available
    const selectedMaterial = materials.find(m => m._id === formData.material_id);
    if (!selectedMaterial) {
      Swal.fire({
        icon: 'warning',
        title: 'Material Not Found',
        text: 'Selected material is no longer available'
      });
      return;
    }

    if (requestedQuantity > selectedMaterial.quantity) {
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Stock',
        text: `Only ${selectedMaterial.quantity} ${selectedMaterial.unit} available. You requested ${requestedQuantity} ${selectedMaterial.unit}.`,
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    if (!formData.purpose || !formData.purpose.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Purpose',
        text: 'Purpose/Reason for request is required'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Submitting Request...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const selectedProject = projects.find(p => p.project_id === formData.project_id || p._id === formData.project_id);

      // Create material request (pending approval)
      const response = await fetch(`${API_URL}/material-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: requestedQuantity,
          foreman_id: localStorage.getItem('userId'),
          foreman_name: fullName || username,
          project_name: selectedProject?.project_name,
          material_name: selectedMaterial.material_name,
          status: 'pending',
          created_at: new Date(),
          request_number: `REQ-${Date.now().toString().slice(-8)}`
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Request Submitted!',
          text: 'Your material request has been submitted and is pending admin approval.',
          timer: 2000
        });

        // Reset form
        setFormData({
          project_id: '',
          material_id: '',
          quantity: '',
          unit: 'pcs',
          priority: 'medium',
          required_by: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
          purpose: '',
          notes: ''
        });
        setAvailabilityCheck({
          checking: false,
          isAvailable: null,
          availableQuantity: null,
          materialName: '',
          unit: ''
        });
        setShowForm(false);
        
        // Refresh requests
        fetchRequests();
      } else {
        throw new Error(data.message || 'Failed to submit request');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit request'
      });
    }
  };

  const handleViewRequest = (request) => {
    Swal.fire({
      title: `Material Request - ${request.request_number || 'REQ'}`,
      html: `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <div style="border-bottom: 2px solid ${priorityOptions.find(p => p.value === request.priority)?.color || '#f59e0b'}; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b;">${request.project_name}</h3>
            <p style="color: #64748b;">Request #: ${request.request_number || 'N/A'}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📦 Material Details</h4>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <p><strong>Material:</strong> ${request.material_name}</p>
              <p><strong>Quantity:</strong> ${request.quantity} ${request.unit}</p>
              <p><strong>Priority:</strong> 
                <span style="color: ${priorityOptions.find(p => p.value === request.priority)?.color}; font-weight: 600;">
                  ${priorityOptions.find(p => p.value === request.priority)?.label || 'Medium'}
                </span>
              </p>
              <p><strong>Required By:</strong> ${new Date(request.required_by).toLocaleDateString()}</p>
            </div>
          </div>
          
          ${request.purpose ? `
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1e293b; margin-bottom: 10px;">🎯 Purpose</h4>
              <p>${request.purpose}</p>
            </div>
          ` : ''}
          
          ${request.notes ? `
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1e293b; margin-bottom: 10px;">📝 Notes</h4>
              <p>${request.notes}</p>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📊 Status</h4>
            <span class="status-badge status-${request.status}">
              ${statusOptions.find(s => s.value === request.status)?.label || request.status}
            </span>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #64748b; font-size: 0.85rem;">
            <p><i class="fas fa-user"></i> Requested by: ${request.foreman_name}</p>
            <p><i class="fas fa-clock"></i> Requested on: ${new Date(request.created_at).toLocaleString()}</p>
          </div>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#f59e0b'
    });
  };

  // Function to clear request history
  const handleClearHistory = async () => {
    const result = await Swal.fire({
      title: 'Clear Request History?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-trash-alt"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            This will clear all your processed material requests.
          </p>
          <p style="color: #64748b; font-size: 0.9rem;">
            Pending requests will remain. This action cannot be undone.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Clear History',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`${API_URL}/material-requests/clear-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foreman_id: userId })
        });
        
        const data = await response.json();
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'History Cleared!',
            text: 'Your request history has been cleared.',
            timer: 1500
          });
          fetchRequests(); // Refresh the list
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to clear history'
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
      confirmButtonColor: '#f59e0b',
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

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="material-requests-container">
      <div className="material-requests-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-truck-loading"></i>
            </div>
            <div>
              <h1>Material Requests</h1>
              <p className="header-subtitle">Request materials (Pending admin approval)</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card pending" onClick={() => setStatusFilter('pending')}>
            <div className="stat-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.pendingRequests}</div>
              <div className="stat-label">Pending Approval</div>
            </div>
          </div>

          <div className="stat-card approved" onClick={() => setStatusFilter('approved')}>
            <div className="stat-icon approved">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.approvedRequests}</div>
              <div className="stat-label">Approved</div>
            </div>
          </div>

          <div className="stat-card rejected" onClick={() => setStatusFilter('rejected')}>
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.rejectedRequests}</div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>

          <div className="stat-card total">
            <div className="stat-icon total">
              <i className="fas fa-boxes"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalMaterials}</div>
              <div className="stat-label">Materials Available</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <div className="action-buttons-group">
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
              {showForm ? 'Cancel Request' : 'Request Materials'}
            </button>

            {requests.some(r => r.status === 'approved' || r.status === 'rejected') && (
              <button className="btn btn-danger-outline" onClick={handleClearHistory}>
                <i className="fas fa-trash-alt"></i>
                Clear History
              </button>
            )}
          </div>

          <div className="filters">
            <div className="filter-group">
              <select 
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)}
                className="project-filter"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Request Form */}
        {showForm && (
          <div className="request-form-section">
            <h3><i className="fas fa-plus-circle"></i> Request Materials</h3>
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Project</label>
                  <select name="project_id" value={formData.project_id} onChange={handleInputChange} required>
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="required">Material</label>
                  <select name="material_id" value={formData.material_id} onChange={handleInputChange} required>
                    <option value="">Select Material</option>
                    {materials.map(material => (
                      <option key={material._id} value={material._id}>
                        {material.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    step="1"
                    placeholder="Enter quantity"
                  />
                  
                  {availabilityCheck.checking && (
                    <small className="help-text">
                      <i className="fas fa-spinner fa-spin"></i> Checking availability...
                    </small>
                  )}
                  
                  {!availabilityCheck.checking && availabilityCheck.isAvailable !== null && (
                    <small 
                      className="help-text" 
                      style={{ 
                        color: availabilityCheck.isAvailable ? '#10b981' : '#ef4444',
                        fontWeight: '600',
                        marginTop: '5px',
                        display: 'block'
                      }}
                    >
                      {availabilityCheck.isAvailable ? (
                        <>
                          <i className="fas fa-check-circle"></i> 
                          {availabilityCheck.availableQuantity} {availabilityCheck.unit} available
                        </>
                      ) : (
                        <>
                          <i className="fas fa-exclamation-circle"></i> 
                          Insufficient stock! Only {availabilityCheck.availableQuantity} {availabilityCheck.unit} available
                        </>
                      )}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="required">Unit</label>
                  <select 
                    name="unit" 
                    value={formData.unit} 
                    onChange={handleInputChange} 
                    required
                    disabled={!!formData.material_id}
                    style={{ 
                      backgroundColor: formData.material_id ? '#f0f0f0' : 'white',
                      cursor: formData.material_id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="bags">Bags</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="m">Meters (m)</option>
                    <option value="roll">Rolls</option>
                    <option value="set">Sets</option>
                    <option value="box">Boxes</option>
                    <option value="liter">Liters</option>
                  </select>
                  {formData.material_id && (
                    <small className="help-text" style={{ color: '#667eea', fontWeight: '600' }}>
                      <i className="fas fa-lock"></i> Unit locked to match material
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange} required>
                    {priorityOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="required">Required By</label>
                  <input
                    type="date"
                    name="required_by"
                    value={formData.required_by}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="required">Purpose</label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Explain why these materials are needed..."
                ></textarea>
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Any special instructions..."
                ></textarea>
              </div>

              <div className="btn-group">
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={
                    availabilityCheck.checking || 
                    (availabilityCheck.isAvailable === false)
                  }
                >
                  <i className="fas fa-paper-plane"></i> Submit Request
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="requests-section">
          <h3><i className="fas fa-list"></i> My Requests</h3>
          
          {loading ? (
            <div className="loading-spinner">Loading requests...</div>
          ) : (
            <div className="requests-grid">
              {requests.length > 0 ? (
                requests.map(request => (
                  <div key={request._id} className="request-card">
                    {/* Card Header */}
                    <div className="request-card-header">
                      <div>
                        <span className="request-number">{request.request_number || 'REQ'}</span>
                        <h4 className="project-name">{request.project_name}</h4>
                      </div>
                      <span className={`priority-badge priority-${request.priority}`}>
                        {priorityOptions.find(p => p.value === request.priority)?.label || 'Medium'}
                      </span>
                    </div>
                    
                    {/* Card Body */}
                    <div className="request-card-body">
                      <div className="info-row">
                        <div className="info-icon">
                          <i className="fas fa-box"></i>
                        </div>
                        <div className="info-content">
                          <span className="info-label">Material</span>
                          <span className="info-value">{request.material_name}</span>
                        </div>
                      </div>
                      
                      <div className="info-row">
                        <div className="info-icon">
                          <i className="fas fa-weight-hanging"></i>
                        </div>
                        <div className="info-content">
                          <span className="info-label">Quantity</span>
                          <span className="info-value quantity">{request.quantity} {request.unit}</span>
                        </div>
                      </div>
                      
                      <div className="info-row">
                        <div className="info-icon">
                          <i className="fas fa-calendar-alt"></i>
                        </div>
                        <div className="info-content">
                          <span className="info-label">Required By</span>
                          <span className="info-value">{new Date(request.required_by).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {request.purpose && (
                        <div className="info-row">
                          <div className="info-icon">
                            <i className="fas fa-info-circle"></i>
                          </div>
                          <div className="info-content">
                            <span className="info-label">Purpose</span>
                            <span className="purpose-text">{request.purpose}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Card Footer */}
                    <div className="request-card-footer">
                      <div className="status-section">
                        <span className={`status-badge status-${request.status}`}>
                          {statusOptions.find(s => s.value === request.status)?.label || request.status}
                        </span>
                        <span className="request-date">
                          <i className="fas fa-clock"></i>
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="request-actions">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewRequest(request)}
                        >
                          <i className="fas fa-eye"></i> View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-truck-loading"></i>
                  </div>
                  <h3>No Requests Found</h3>
                  <p>
                    {selectedProject !== 'all' || statusFilter !== 'all'
                      ? 'No requests match your filters.'
                      : 'Submit a material request to get started.'}
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> Request Materials
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialRequests;
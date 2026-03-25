// In Workers.js, update the form and functions

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Workers.css';

const API_URL = 'http://localhost:5000/api';

const Workers = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    activeWorkers: 0,
    averageRate: 0
  });

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    position: '',
    specialty: '',
    daily_rate: '',
    status: 'active'
  });

  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchTerm]);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/workers`);
      const data = await response.json();
      setWorkers(data.workers || []);
      calculateStats(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load workers'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (workersList) => {
    const totalWorkers = workersList.length;
    const activeWorkers = workersList.filter(w => w.status === 'active').length;
    const totalRates = workersList.reduce((sum, w) => sum + (w.daily_rate || 0), 0);
    const averageRate = totalWorkers > 0 ? totalRates / totalWorkers : 0;

    setStats({
      totalWorkers,
      activeWorkers,
      averageRate
    });
  };

  const filterWorkers = () => {
    if (!searchTerm) {
      setFilteredWorkers(workers);
    } else {
      const filtered = workers.filter(worker => 
        worker.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredWorkers(filtered);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For phone number, only allow digits
    if (name === 'phone') {
      const filteredValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: filteredValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const validatePhoneNumber = (phone) => {
    if (!phone) return { isValid: false, message: 'Phone number is required' };
    
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    
    // Philippine mobile numbers: 11 digits starting with 09
    if (phoneDigits.length === 11 && phoneDigits.startsWith('09')) {
      return { isValid: true };
    }
    // Allow other formats for international
    else if (phoneDigits.length >= 10 && phoneDigits.length <= 15) {
      return { isValid: true };
    }
    else {
      return { 
        isValid: false, 
        message: 'Please enter a valid phone number (11 digits for PH: 09XXXXXXXXX)' 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Name',
        text: 'Please enter worker name'
      });
      return;
    }

    // Validate phone number - REQUIRED
    const phoneValidation = validatePhoneNumber(formData.phone);
    if (!phoneValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Phone Number',
        text: phoneValidation.message
      });
      return;
    }

    // Validate specialty - REQUIRED
    if (!formData.specialty) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Specialty',
        text: 'Please enter worker specialty'
      });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: localStorage.getItem('userId'),
          created_at: new Date()
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Worker added successfully',
          timer: 1500
        });
        setShowForm(false);
        setFormData({
          full_name: '',
          phone: '',
          position: '',
          specialty: '',
          daily_rate: '',
          status: 'active'
        });
        fetchWorkers();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add worker'
      });
    }
  };

  const handleStatusChange = async (workerId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/workers/${workerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          updated_by: localStorage.getItem('userId')
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Server response:', text);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Worker status updated to ${newStatus}`,
          timer: 1500,
          showConfirmButton: false
        });
        fetchWorkers();
      } else {
        throw new Error(data.message || 'Failed to update worker status');
      }
    } catch (error) {
      console.error('Error updating worker status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update worker status. Please try again.'
      });
    }
  };

  const handleDeleteWorker = async (workerId, workerName) => {
    const result = await Swal.fire({
      title: 'Delete Worker?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px;">
            Delete worker:<br>
            <strong>"${workerName}"</strong>?
          </p>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This action cannot be undone!
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/workers/${workerId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const text = await response.text();
          console.error('Server response:', text);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Worker has been deleted',
            timer: 1500,
            showConfirmButton: false
          });
          fetchWorkers();
        } else {
          throw new Error(data.message || 'Delete failed');
        }
      } catch (error) {
        console.error('Error deleting worker:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete worker. Please try again.'
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

  return (
    <div className="workers-container">
      <div className="workers-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-users"></i>
            </div>
            <div>
              <h1>Workers Management</h1>
              <p className="header-subtitle">Manage construction workers and their rates</p>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/dashboard-foreman" className="btn btn-secondary">
              <i className="fas fa-arrow-left"></i> Dashboard
            </Link>
            <button className="logout-btn-small" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.totalWorkers}</div>
            <div className="stat-label">Total Workers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.activeWorkers}</div>
            <div className="stat-label">Active Workers</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">₱{stats.averageRate.toFixed(0)}</div>
            <div className="stat-label">Avg Daily Rate</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
            {showForm ? 'Cancel' : 'Add New Worker'}
          </button>

          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search workers by name, position, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Add Worker Form */}
        {showForm && (
          <div className="worker-form-section">
            <h3>Add New Worker</h3>
            <form onSubmit={handleSubmit} className="worker-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>

                <div className="form-group">
                  <label className="required">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="09123456789 (11 digits)"
                  />
                  <small className="help-text">Enter 11-digit Philippine mobile number (e.g., 09123456789)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Carpenter, Mason, Electrician"
                  />
                </div>

                <div className="form-group">
                  <label className="required">Specialty</label>
                  <input
                    type="text"
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Formworks, Finishing, Plumbing"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Daily Rate (₱)</label>
                  <input
                    type="number"
                    name="daily_rate"
                    value={formData.daily_rate}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g., 500"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Add Worker
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Workers List */}
        {loading ? (
          <div className="loading-spinner">Loading workers...</div>
        ) : (
          <div className="workers-list">
            {filteredWorkers.length > 0 ? (
              filteredWorkers.map(worker => (
                <div key={worker._id} className="worker-card">
                  <div className="worker-avatar-large">
                    {worker.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="worker-details">
                    <h3 className="worker-name">{worker.full_name}</h3>
                    <div className="worker-badges">
                      <span className="worker-position">{worker.position}</span>
                      {worker.specialty && (
                        <span className="worker-specialty">{worker.specialty}</span>
                      )}
                    </div>
                    <div className="worker-info-grid">
                      <div className="worker-info-item">
                        <i className="fas fa-phone"></i> {worker.phone}
                      </div>
                      <div className="worker-info-item">
                        <i className="fas fa-money-bill-wave"></i> ₱{worker.daily_rate}/day
                      </div>
                    </div>
                  </div>
                  <div className="worker-actions">
                    <select 
                      value={worker.status}
                      onChange={(e) => handleStatusChange(worker._id, e.target.value)}
                      className={`status-select ${worker.status}`}
                      aria-label="Change worker status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteWorker(worker._id, worker.full_name)}
                      title="Delete Worker"
                      aria-label="Delete worker"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-users empty-icon"></i>
                <h3>No Workers Found</h3>
                <p>
                  {searchTerm ? 'No workers match your search' : 'Add your first worker to get started'}
                </p>
                {!searchTerm && (
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> Add Worker
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workers;
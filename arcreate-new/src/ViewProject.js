// ViewProject.js - Simplified view-only version
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { projectsAPI, paymentsAPI, progressAPI } from './api';
import './ViewProject.css';

const ViewProject = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [payments, setPayments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Fetch project details
      const projectData = await projectsAPI.getById(id);
      setProject(projectData.project);

      // Fetch payments for this project
      const paymentsData = await paymentsAPI.getByProject(id);
      setPayments(paymentsData.payments || []);

      // Fetch progress updates for this project
      const progressData = await progressAPI.getByProject(id);
      setProgress(progressData.updates || []);
    } catch (error) {
      console.error('Error fetching project:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load project details'
      }).then(() => {
        navigate('/projects');
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: '#f59e0b',
      construction: '#3b82f6',
      finishing: '#8b5cf6',
      completed: '#10b981',
      on_hold: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      planning: 'Planning',
      construction: 'Construction',
      finishing: 'Finishing',
      completed: 'Completed',
      on_hold: 'On Hold',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="view-project-container">
        <div className="loading-spinner">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="view-project-container">
        <div className="error-message">Project not found</div>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = (project.total_contract_amount || 0) - totalPaid;

  return (
    <div className="view-project-container">
      <div className="view-project-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-project-diagram"></i>
            </div>
            <div>
              <h1>Project Details</h1>
              <p className="header-subtitle">{project.project_name}</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Project Status Banner */}
        <div className="project-status-banner" style={{ backgroundColor: getStatusColor(project.status) + '20', borderLeft: `4px solid ${getStatusColor(project.status)}` }}>
          <div className="status-info">
            <span className="status-label">Status:</span>
            <span className="status-value" style={{ color: getStatusColor(project.status) }}>
              {getStatusLabel(project.status)}
            </span>
          </div>
          <div className="progress-info">
            <span className="progress-label">Overall Progress:</span>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%`, backgroundColor: getStatusColor(project.status) }}></div>
            </div>
            <span className="progress-value">{project.progress || 0}%</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="view-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-info-circle"></i> Overview
          </button>
          <button 
            className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <i className="fas fa-credit-card"></i> Payments
          </button>
          <button 
            className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            <i className="fas fa-chart-line"></i> Progress Updates
          </button>
          <button 
            className={`tab ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <i className="fas fa-users"></i> Team
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="details-grid">
                <div className="detail-section">
                  <h3><i className="fas fa-building"></i> Project Information</h3>
                  <div className="detail-item">
                    <span className="detail-label">Project Name:</span>
                    <span className="detail-value">{project.project_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Project Type:</span>
                    <span className="detail-value">{project.project_type || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{project.address || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Description:</span>
                    <span className="detail-value">{project.description || 'No description provided'}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><i className="fas fa-calendar"></i> Timeline</h3>
                  <div className="detail-item">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">{formatDate(project.start_date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Estimated End Date:</span>
                    <span className="detail-value">{formatDate(project.estimated_end_date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Created On:</span>
                    <span className="detail-value">{formatDate(project.created_at)}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3><i className="fas fa-money-bill-wave"></i> Financial Summary</h3>
                  <div className="detail-item">
                    <span className="detail-label">Contract Amount:</span>
                    <span className="detail-value amount">{formatCurrency(project.total_contract_amount)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Paid:</span>
                    <span className="detail-value amount paid">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Balance:</span>
                    <span className={`detail-value amount ${balance > 0 ? 'negative' : 'positive'}`}>
                      {formatCurrency(balance)}
                      {balance > 0 ? ' (Due)' : ' (Paid)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="payments-tab">
              <h3>Payment History</h3>
              {payments.length > 0 ? (
                <div className="payments-list">
                  {payments.map(payment => (
                    <div key={payment._id} className="payment-item">
                      <div className="payment-header">
                        <span className="payment-date">{formatDate(payment.payment_date)}</span>
                        <span className={`payment-status status-${payment.payment_status || 'paid'}`}>
                          {payment.payment_status || 'Paid'}
                        </span>
                      </div>
                      <div className="payment-details">
                        <div className="payment-amount">Amount: {formatCurrency(payment.amount)}</div>
                        <div className="payment-method">Method: {payment.payment_method || 'Not specified'}</div>
                        {payment.reference_number && (
                          <div className="payment-reference">Ref: {payment.reference_number}</div>
                        )}
                        {payment.notes && (
                          <div className="payment-notes">Notes: {payment.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-credit-card empty-icon"></i>
                  <p>No payments recorded for this project</p>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="progress-tab">
              <h3>Progress Updates</h3>
              {progress.length > 0 ? (
                <div className="timeline">
                  {progress.map((update, index) => (
                    <div key={update._id} className="timeline-item">
                      <div className="timeline-marker">
                        <div className="marker-dot" style={{ background: getStatusColor(project.status) }}></div>
                        {index < progress.length - 1 && <div className="marker-line"></div>}
                      </div>
                      <div className="timeline-content">
                        <div className="update-header">
                          <span className="update-date">{formatDate(update.progress_date)}</span>
                          <span className="update-phase">{update.phase}</span>
                        </div>
                        <div className="update-progress">
                          <div className="progress-bar-small">
                            <div className="progress-fill-small" style={{ width: `${update.percentage}%` }}></div>
                          </div>
                          <span className="progress-percentage">{update.percentage}%</span>
                        </div>
                        <p className="update-description">{update.description}</p>
                        <div className="update-footer">
                          <span className="reported-by">
                            <i className="fas fa-user"></i> {update.reported_by || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-chart-line empty-icon"></i>
                  <p>No progress updates yet</p>
                </div>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="team-tab">
              <h3>Project Team</h3>
              <div className="team-grid">
                {project.foreman && (
                  <div className="team-card">
                    <div className="team-avatar">
                      {project.foreman.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="team-info">
                      <h4>{project.foreman.full_name}</h4>
                      <p className="team-role">Site Foreman</p>
                      {project.foreman.email && (
                        <p><i className="fas fa-envelope"></i> {project.foreman.email}</p>
                      )}
                      {project.foreman.phone && (
                        <p><i className="fas fa-phone"></i> {project.foreman.phone}</p>
                      )}
                    </div>
                  </div>
                )}
                {project.client && (
                  <div className="team-card">
                    <div className="team-avatar client">
                      {project.client.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="team-info">
                      <h4>{project.client.full_name}</h4>
                      <p className="team-role">Client</p>
                      {project.client.email && (
                        <p><i className="fas fa-envelope"></i> {project.client.email}</p>
                      )}
                      {project.client.phone && (
                        <p><i className="fas fa-phone"></i> {project.client.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Removed all action buttons - now just a pure view page */}
        
      </div>
    </div>
  );
};

export default ViewProject;
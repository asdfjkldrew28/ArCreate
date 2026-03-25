// In ClientDashboard.js, update the button handlers and navigation

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { dashboardAPI } from './api';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';
import './ClientDashboard.css';

// Format large numbers in compact form (K, M, B)
const formatCompactNumber = (num) => {
  if (num >= 1_000_000_000) return `₱${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `₱${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₱${(num / 1_000).toFixed(1)}K`;
  return `₱${num.toLocaleString()}`;
};

const ClientDashboard = ({ username, fullName, onLogout }) => {
  const API_URL = 'http://localhost:5000/api';
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientInfo, setClientInfo] = useState({});
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalInvestment: 0,
    paidAmount: 0
  });
  const [projects, setProjects] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [recentProgress, setRecentProgress] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchUnreadCount();
    fetchNotifications();
    
    // Set up polling for notifications
    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(notificationInterval);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/messages/unread-count/${userId}`);
      const data = await response.json();
      setUnreadMessagesCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const data = await dashboardAPI.getClient(userId);

      setClientInfo(data.clientInfo || {});
      setStats(data.stats);
      setProjects(data.projects || []);
      setRecentPayments(data.recentPayments || []);
      setRecentUpdates(data.recentUpdates || []);
      setProjectTeam(data.projectTeam || []);
      
      // Fetch recent progress updates for all client projects
      const progressResponse = await fetch(`${API_URL}/progress/client/${userId}/recent?limit=5`);
      const progressData = await progressResponse.json();
      setRecentProgress(progressData.updates || []);
      
      // Fetch recent documents for all client projects
      const docsResponse = await fetch(`${API_URL}/documents/client/${userId}?limit=5`);
      const docsData = await docsResponse.json();
      setRecentDocuments(docsData.documents || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load dashboard data'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch notifications from backend
      const response = await fetch(`${API_URL}/notifications/${userId}`);
      const data = await response.json();
      
      if (data.success && data.notifications) {
        // Convert to frontend format
        const newNotifications = data.notifications.map(n => ({
          id: n._id,
          type: n.type === 'progress_update' ? 'project' : n.type,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          read: n.is_read,
          link: n.link,
          persistent: false
        }));
        
        // Merge with existing
        const existingIds = new Set(notifications.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        
        if (uniqueNew.length > 0) {
          setNotifications(prev => [...uniqueNew, ...prev].slice(0, 50));
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    if (notificationId === 'all') {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/view-project/${projectId}`);
  };

  const handleViewProgress = (projectId) => {
    navigate(`/progress-updates?project_id=${projectId}`);
  };

  const handleMakePayment = (projectId) => {
    navigate(`/make-payment?project_id=${projectId}`);
  };

  const getBadgeStyle = (count, color) => {
    let size = 20;
    let padding = 0;
    let borderRadius = '50%';
    
    if (count <= 9) {
      size = 20;
      padding = 0;
      borderRadius = '50%';
    } else if (count <= 99) {
      size = 22;
      padding = '0 6px';
      borderRadius = '20px';
    } else if (count <= 999) {
      size = 24;
      padding = '0 8px';
      borderRadius = '20px';
    } else {
      size = 26;
      padding = '0 8px';
      borderRadius = '20px';
    }
    
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: `${size}px`,
      height: `${size}px`,
      padding: padding,
      background: color,
      color: 'white',
      borderRadius: borderRadius,
      fontSize: count > 99 ? '0.6rem' : '0.7rem',
      fontWeight: 'bold',
      lineHeight: 1,
      marginLeft: 'auto',
      animation: 'pulse 1s infinite'
    };
  };

  const handleRequestQuotation = () => {
    Swal.fire({
      title: 'Request a Quotation',
      html: `
        <div style="text-align: left;">
          <div class="form-group">
            <label>Project Type</label>
            <select id="project-type" class="swal2-input" style="margin-bottom: 15px;">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="renovation">Renovation</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
          <div class="form-group">
            <label>Project Description</label>
            <textarea id="project-description" class="swal2-textarea" placeholder="Describe your project..." rows="4"></textarea>
          </div>
          <div class="form-group">
            <label>Estimated Budget</label>
            <input type="text" id="estimated-budget" class="swal2-input" placeholder="e.g., 1,000,000">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Submit Request',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#667eea',
      preConfirm: () => {
        const projectType = document.getElementById('project-type').value;
        const description = document.getElementById('project-description').value;
        const budget = document.getElementById('estimated-budget').value;
        
        if (!description) {
          Swal.showValidationMessage('Please provide a project description');
          return false;
        }
        
        return { projectType, description, budget };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Request Submitted!',
          text: 'Your quotation request has been sent. We will contact you soon.',
          timer: 2000
        });
      }
    });
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenDocumentLink = async (doc) => {
    if (!doc || !doc.file_url) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No document link available'
      });
      return;
    }
    
    // Open the link in a new tab
    window.open(doc.file_url, '_blank');
    
    Swal.fire({
      icon: 'success',
      title: 'Opening Link',
      text: `Opening ${doc.document_name} in a new tab.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Helper function for document icons
  const getDocumentIcon = (type) => {
    const icons = {
      contract: 'fa-file-signature',
      blueprint: 'fa-draw-polygon',
      permit: 'fa-file-alt',
      invoice: 'fa-file-invoice',
      report: 'fa-file-pdf',
      photo: 'fa-file-image',
      other: 'fa-file'
    };
    return icons[type] || 'fa-file';
  };

  return (
    <div className="dashboard-container">
      {/* Hamburger Menu Button */}
      <button className={`hamburger-menu client-toggle ${sidebarOpen ? 'active' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <div className={`sidebar client-sidebar ${sidebarOpen ? 'active' : ''}`} id="sidebar">
        <div className="logo">
          <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          <h2>ArCreate</h2>
        </div>

        <div className="user-info">
          <div className="user-avatar client-avatar">
            {fullName ? fullName.charAt(0).toUpperCase() : username?.charAt(0).toUpperCase()}
          </div>
          <div className="user-name">{fullName || username}</div>
          <div className="user-role">Client</div>
          <div className="client-type">{clientInfo.company || 'Individual Client'}</div>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/my-projects" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-project-diagram"></i> My Projects
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/invoices" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-file-invoice"></i> Invoices
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/payments" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-credit-card"></i> Payments
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/progress-updates" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-chart-line"></i> Progress Updates
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/project-team" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-users"></i> Project Team
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/documents" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-folder-open"></i> Documents
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/messages" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-envelope"></i> Messages
              {unreadMessagesCount > 0 && (
                <span style={getBadgeStyle(unreadMessagesCount, '#3b82f6')}>
                  {unreadMessagesCount > 999 ? '999+' : unreadMessagesCount}
                </span>
              )}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-user-cog"></i> Profile Settings
            </Link>
          </li>
        </ul>

        <button className="logout-btn client-logout" onClick={() => {
          handleLogout();
          closeSidebar();
        }}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <div>
              <h1>My Projects Dashboard</h1>
              <p className="header-subtitle">Track your construction projects and investments</p>
            </div>
          </div>
          <div className="header-right">
            <NotificationCenter 
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onClearAll={handleClearAll}
              onNotificationClick={handleNotificationClick}
            />
            <div className="date-display">
              <i className="fas fa-calendar-alt"></i> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="welcome-section client-welcome">
          <div className="welcome-content">
            <div className="welcome-icon">
              <i className="fas fa-handshake"></i>
            </div>
            <div className="welcome-text">
              <h2>Welcome, {fullName || username}!</h2>
              <p>Thank you for choosing ArCreate for your construction needs.</p>
              <div className="contact-details">
                <div><i className="fas fa-phone"></i> {clientInfo.phone || 'Not provided'}</div>
                <div><i className="fas fa-envelope"></i> {clientInfo.email || 'Not provided'}</div>
                <div><i className="fas fa-building"></i> {clientInfo.client_type || 'individual'} Client</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading dashboard data...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon projects">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalProjects || 0}</div>
                  <div className="stat-label">Total Projects</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon active">
                  <i className="fas fa-hard-hat"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeProjects || 0}</div>
                  <div className="stat-label">Active Projects</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon investment">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCompactNumber(stats.totalInvestment || 0)}</div>
                  <div className="stat-label">Total Investment</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon paid">
                  <i className="fas fa-wallet"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCompactNumber(stats.paidAmount || 0)}</div>
                  <div className="stat-label">Amount Paid</div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="two-column-layout">
              {/* Left Column */}
              <div>
                {/* My Projects */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-list"></i> My Projects</h3>
                    <Link to="/my-projects" className="view-all">View All →</Link>
                  </div>

                  {projects.length > 0 ? (
                    projects.map(project => {
                      const balance = project.balance || 0;
                      return (
                        <div key={project.project_id} className="project-card">
                          <div className="project-header">
                            <div>
                              <h4 className="project-title">{project.project_name}</h4>
                              <div className="project-meta">
                                {project.project_type || 'Residential'} • {project.address || 'Address not specified'}
                              </div>
                            </div>
                            <span className={`project-status status-${project.status}`}>
                              {project.status?.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="project-details">
                            <div>
                              <div className="detail-item">
                                <strong>Project Manager:</strong> {project.project_manager || 'Not assigned'}
                              </div>
                              <div className="detail-item">
                                <strong>Start Date:</strong> {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                              </div>
                            </div>
                            <div>
                              <div className="detail-item">
                                <strong>Contract Amount:</strong> ₱{Number(project.total_contract_amount || 0).toLocaleString()}
                              </div>
                              <div className="detail-item balance" style={{color: balance > 0 ? '#ef4444' : '#10b981'}}>
                                <strong>Balance:</strong> ₱{balance.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="project-actions">
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleViewProject(project.project_id)}
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button 
                              className="btn btn-secondary"
                              onClick={() => handleViewProgress(project.project_id)}
                            >
                              <i className="fas fa-chart-line"></i> Progress
                            </button>
                            <button 
                              className="btn btn-success"
                              onClick={() => handleMakePayment(project.project_id)}
                            >
                              <i className="fas fa-credit-card"></i> Pay
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">🏗️</div>
                      <h3>No Projects Yet</h3>
                      <p>You don't have any construction projects yet.</p>
                      <button className="btn btn-primary" onClick={handleRequestQuotation}>
                        <i className="fas fa-file-invoice-dollar"></i> Request a Quotation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Project Team */}
                <div className="dashboard-section">
                  <h3><i className="fas fa-users"></i> Project Team</h3>
                  
                  {projectTeam.length > 0 ? (
                    <div className="team-list">
                      {projectTeam.map(member => (
                        <div key={member.user_id} className="team-card">
                          <div className="team-member">
                            <div className="member-avatar">
                              {member.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="member-info">
                              <div className="member-name">{member.full_name}</div>
                              <div className="member-role">{member.role?.replace('_', ' ')}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">👥</div>
                      <p>No team members assigned yet</p>
                    </div>
                  )}
                </div>

                {/* Recent Payments */}
                <div className="dashboard-section">
                  <h3><i className="fas fa-credit-card"></i> Recent Payments</h3>
                  
                  {recentPayments.length > 0 ? (
                    <div className="payments-list">
                      {recentPayments.map(payment => (
                        <div key={payment.payment_id} className="payment-card">
                          <div className="payment-header">
                            <div className="payment-project">{payment.project_name}</div>
                            <div className="payment-amount">₱{Number(payment.amount).toLocaleString()}</div>
                          </div>
                          <div className="payment-type">{payment.payment_type?.replace('_', ' ')}</div>
                          <div className="payment-meta">
                            {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">💳</div>
                      <p>No payments made yet</p>
                    </div>
                  )}
                  
                  {recentPayments.length > 0 && (
                    <Link to="/payments" className="btn btn-primary full-width">
                      <i className="fas fa-history"></i> Payment History
                    </Link>
                  )}
                </div>

                {/* Recent Progress Updates - New Section */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-chart-line"></i> Recent Progress Updates</h3>
                    <Link to="/progress-updates" className="view-all">View All →</Link>
                  </div>
                  
                  {recentProgress.length > 0 ? (
                    <div className="updates-list">
                      {recentProgress.map(update => (
                        <div key={update.progress_id} className="progress-card">
                          <div className="progress-header">
                            <div className="progress-project">{update.project_name}</div>
                            <div className="progress-percentage-badge">{update.percentage}%</div>
                          </div>
                          <div className="progress-phase">{update.phase?.replace('_', ' ')}</div>
                          <div className="progress-desc">{update.description?.substring(0, 100)}...</div>
                          <div className="progress-meta">
                            <i className="fas fa-calendar"></i> {new Date(update.progress_date).toLocaleDateString()}
                            <span className="separator">•</span>
                            <i className="fas fa-user"></i> {update.reported_by}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">📊</div>
                      <p>No progress updates yet. Your foreman will post updates soon.</p>
                    </div>
                  )}
                </div>

                {/* Recent Documents - New Section */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-folder-open"></i> Recent Documents</h3>
                    <Link to="/documents" className="view-all">View All →</Link>
                  </div>
                  
                  {recentDocuments.length > 0 ? (
                    <div className="documents-list">
                      {recentDocuments.map(doc => (
                        <div key={doc._id} className="document-card">
                          <div className="document-icon">
                            <i className={`fas ${getDocumentIcon(doc.document_type)}`}></i>
                          </div>
                          <div className="document-info">
                            <div className="document-name">{doc.document_name}</div>
                            <div className="document-type">{doc.document_type}</div>
                            <div className="document-meta">
                              {new Date(doc.upload_date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="document-actions">
                            <button
                              className="action-btn open-link-btn"
                              onClick={() => handleOpenDocumentLink(doc)}
                              title="Open Link"
                            >
                              <i className="fas fa-external-link-alt"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">📄</div>
                      <p>No documents uploaded yet. Check back later for contracts and plans.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
// In DashboardAdmin.js, update the header section and fix buttons

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { dashboardAPI } from './api';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';
import notificationService from './notificationService';
import './DashboardAdmin.css';

const DashboardAdmin = ({ username, fullName, onLogout }) => {
  const API_URL = 'http://localhost:5000/api';
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalClients: 0,
    totalSuppliers: 0,
    totalRevenue: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    pendingInquiries: 0,
    activeProjects: 0
  });
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingResetsCount, setPendingResetsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [selectedProjectForDoc, setSelectedProjectForDoc] = useState(null);
  const [documentFormData, setDocumentFormData] = useState({
    project_id: '',
    document_name: '',
    document_type: 'contract',
    description: '',
    file_url: '', // Changed from file to file_url (link)
    is_link: true // Flag to indicate this is a link, not a file upload
  });

  const documentTypes = [
    { value: 'contract', label: '📄 Contract', icon: 'fa-file-signature' },
    { value: 'blueprint', label: '📐 Blueprint', icon: 'fa-draw-polygon' },
    { value: 'permit', label: '📋 Permit', icon: 'fa-file-alt' },
    { value: 'invoice', label: '🧾 Invoice', icon: 'fa-file-invoice' },
    { value: 'report', label: '📊 Report', icon: 'fa-file-pdf' },
    { value: 'photo', label: '📸 Photo', icon: 'fa-file-image' },
    { value: 'other', label: '📁 Other', icon: 'fa-file' }
  ];
  useEffect(() => {
    fetchDashboardData();
    fetchCounts();
    fetchNotifications();
    const interval = setInterval(fetchCounts, 30000);
    const notificationInterval = setInterval(fetchNotifications, 60000);
    return () => {
      clearInterval(interval);
      clearInterval(notificationInterval);
    };
  }, []);

  useEffect(() => {
    // Clean up old notifications older than 7 days
    const cleanup = () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      
      const currentNotifications = notificationService.getNotifications();
      const hasOld = currentNotifications.some(n => new Date(n.timestamp) < cutoffDate);
      
      if (hasOld) {
        notificationService.removeOldNotifications(7);
        setNotifications(notificationService.getNotifications());
      }
    };
    
    cleanup();
  }, []);

  const fetchCounts = async () => {
    try {
      const userId = localStorage.getItem('userId');

      const resetResponse = await fetch(`${API_URL}/auth/pending-resets-count`);
      const resetData = await resetResponse.json();
      setPendingResetsCount(resetData.count || 0);

      const materialResponse = await fetch(`${API_URL}/material-requests/pending-count`);
      const materialData = await materialResponse.json();
      
      const taskResponse = await fetch(`${API_URL}/task-requests/pending-count`);
      const taskData = await taskResponse.json();
      
      setPendingRequestsCount((materialData.count || 0) + (taskData.count || 0));

      const messagesResponse = await fetch(`${API_URL}/messages/unread-count/${userId}`);
      const messagesData = await messagesResponse.json();
      setUnreadMessagesCount(messagesData.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };



  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await dashboardAPI.getAdmin();
      setStats(data.stats);
      setRecentUsers(data.recentUsers || []);
      setRecentProjects(data.recentProjects || []);

      // Fetch stock alerts for admin
      const lowStockResponse = await fetch(`${API_URL}/materials/low-stock`);
      const lowStockData = await lowStockResponse.json();
      setLowStockItems(lowStockData.materials || []);

      const outOfStockResponse = await fetch(`${API_URL}/materials/out-of-stock`);
      const outOfStockData = await outOfStockResponse.json();
      setOutOfStockItems(outOfStockData.materials || []);

      // Fetch all materials to calculate category stats
      const materialsResponse = await fetch(`${API_URL}/materials`);
      const materialsData = await materialsResponse.json();
      const materials = materialsData.materials || [];
      
      // Calculate category stats
      const categoryCounts = {};
      materials.forEach(item => {
        if (!categoryCounts[item.category]) {
          categoryCounts[item.category] = { count: 0, outOfStock: 0, lowStock: 0 };
        }
        categoryCounts[item.category].count++;
        if (item.quantity <= 0) categoryCounts[item.category].outOfStock++;
        else if (item.quantity <= item.min_stock_level) categoryCounts[item.category].lowStock++;
      });
      setCategoryStats(categoryCounts);

      // Fetch recent documents
      const documentsResponse = await fetch(`${API_URL}/documents/recent`);
      const documentsData = await documentsResponse.json();
      setRecentDocuments(documentsData.documents || []);
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
      // Get current time to check when notifications were last fetched
      const lastCheck = localStorage.getItem('notifications_last_check_admin');
      const now = new Date().toISOString();

      const newNotifications = [];

      // Fetch pending material requests
      const materialResponse = await fetch(`${API_URL}/material-requests/pending-count`);
      const materialData = await materialResponse.json();

      if (materialData.count > 0) {
        newNotifications.push({
          type: 'request',
          title: 'Material Requests Pending',
          message: `${materialData.count} material request${materialData.count > 1 ? 's' : ''} awaiting approval`,
          timestamp: now,
          link: '/admin-requests',
          persistent: true
        });
      }

      // Fetch pending password resets
      const resetResponse = await fetch(`${API_URL}/auth/pending-resets-count`);
      const resetData = await resetResponse.json();

      if (resetData.count > 0) {
        newNotifications.push({
          type: 'warning',
          title: 'Password Reset Requests',
          message: `${resetData.count} user${resetData.count > 1 ? 's' : ''} requested password reset`,
          timestamp: now,
          link: '/manage-users',
          persistent: true
        });
      }

      // Fetch low stock notifications - only if count changed
      const lowStockResponse = await fetch(`${API_URL}/materials/low-stock`);
      const lowStockData = await lowStockResponse.json();

      if (lowStockData.materials?.length > 0) {
        const criticalCount = lowStockData.materials.filter(m => m.quantity === 0).length;
        const lowCount = lowStockData.materials.length - criticalCount;

        if (criticalCount > 0) {
          newNotifications.push({
            type: 'danger',
            title: '⚠️ Critical Stock Alert',
            message: `${criticalCount} item${criticalCount > 1 ? 's are' : ' is'} out of stock!`,
            timestamp: now,
            link: '/inventory',
            persistent: true
          });
        }

        if (lowCount > 0) {
          newNotifications.push({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `${lowCount} item${lowCount > 1 ? 's' : ''} are running low`,
            timestamp: now,
            link: '/inventory',
            persistent: true
          });
        }
      }

      // Add new notifications to service (handles duplicates automatically)
      const addedCount = notificationService.addNotifications(newNotifications);

      if (addedCount > 0) {
        console.log(`Added ${addedCount} new notifications`);
      }

      // Update local state
      setNotifications(notificationService.getNotifications());

      // Update last check time
      localStorage.setItem('notifications_last_check_admin', now);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    if (notificationId === 'all') {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      localStorage.setItem('unreadNotifications', 0);
    } else {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      const remainingUnread = notifications.filter(n => n.id !== notificationId && !n.read).length;
      localStorage.setItem('unreadNotifications', remainingUnread);
    }
  };

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('unreadNotifications', 0);
  };

  const handleNotificationClick = (notification) => {
    if (notification.link) {
      navigate(notification.link);
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

  const handleDeleteDocument = async (docId, docName) => {
    const result = await Swal.fire({
      title: 'Delete Document?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Delete document:<br>
            <strong>"${docName}"</strong>?
          </p>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This action cannot be undone!
          </p>
          <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin-top: 10px;">
            <p style="color: #92400e; font-size: 0.85rem;">
              <i class="fas fa-info-circle"></i>
              The client will no longer have access to this document.
            </p>
          </div>
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
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');

        const response = await fetch(`${API_URL}/documents/${docId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            user_role: userRole,
            username: username
          })
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Document has been deleted successfully.',
            timer: 1500
          });
          
          // Optionally refresh the recent documents list if you have one
          // You can add a refresh function here
          
        } else {
          throw new Error(data.message || 'Delete failed');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete document'
        });
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleUploadDocument = (project) => {
    setSelectedProjectForDoc(project);
    setDocumentFormData({
      project_id: project.project_id,
      document_name: '',
      document_type: 'contract',
      description: '',
      file_url: '',
      is_link: true
    });
    setShowDocumentForm(true);
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    
    if (!documentFormData.file_url) {
      Swal.fire({
        icon: 'warning',
        title: 'No Link Provided',
        text: 'Please enter a valid link (Google Drive, Mediafire, etc.)'
      });
      return;
    }
    
    if (!documentFormData.document_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Document Name',
        text: 'Please enter a document name'
      });
      return;
    }

    // Validate URL format
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(documentFormData.file_url)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid URL',
        text: 'Please enter a valid URL (e.g., https://drive.google.com/... or https://www.mediafire.com/...)'
      });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: documentFormData.project_id,
          project_name: selectedProjectForDoc.project_name,
          document_name: documentFormData.document_name,
          document_type: documentFormData.document_type,
          description: documentFormData.description,
          file_url: documentFormData.file_url, // Store the link
          is_link: true, // Flag this as an external link
          file_size: null, // No file size for links
          uploaded_by: localStorage.getItem('userId'),
          uploaded_by_name: fullName || username,
          upload_date: new Date()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Document Link Added!',
          text: 'Document link has been shared successfully.',
          timer: 1500
        });
        
        setShowDocumentForm(false);
        setSelectedProjectForDoc(null);
        // Optionally refresh documents list
      } else {
        throw new Error(data.message || 'Failed to add document link');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add document link'
      });
    }
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

  const getCategoryColor = (category) => {
    const colors = {
      construction: '#f59e0b',
      hardware: '#ef4444',
      electrical: '#fbbf24',
      plumbing: '#0891b2',
      finishing: '#8b5cf6',
      tools: '#ea580c',
      safety: '#dc2626',
      office: '#6b7280'
    };
    return colors[category] || '#667eea';
  };

  return (
    <div className="dashboard-container">
      {/* Hamburger Menu Button */}
      <button className={`hamburger-menu ${sidebarOpen ? 'active' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <div className={`sidebar admin-sidebar ${sidebarOpen ? 'active' : ''}`} id="sidebar">
        <div className="logo">
          <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          <h2>ArCreate</h2>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            {fullName ? fullName.charAt(0).toUpperCase() : username?.charAt(0).toUpperCase()}
          </div>
          <div className="user-name">{fullName || username}</div>
          <div className="user-role">System Administrator</div>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/manage-users" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-users-cog"></i>
              <span>User Management</span>
              {pendingResetsCount > 0 && (
                <NotificationBadge 
                  count={pendingResetsCount} 
                  variant="danger" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/projects" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-project-diagram"></i>
              <span>All Projects</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/suppliers" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-truck"></i>
              <span>Suppliers</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/admin-requests" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-clipboard-list"></i>
              <span>Requests</span>
              {pendingRequestsCount > 0 && (
                <NotificationBadge 
                  count={pendingRequestsCount} 
                  variant="warning" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/reports" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-chart-bar"></i>
              <span>Reports</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/admin-documents" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-folder-open"></i>
              <span>Manage Documents</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/activity-logs" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-history"></i>
              <span>Activity Logs</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/inventory" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-boxes"></i>
              <span>Inventory</span>
              {stats.lowStockCount > 0 && (
                <NotificationBadge 
                  count={stats.lowStockCount} 
                  variant="warning" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/messages" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-envelope"></i>
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <NotificationBadge 
                  count={unreadMessagesCount} 
                  variant="info" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/profile" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-user-cog"></i>
              <span>Profile</span>
            </Link>
          </li>
        </ul>

        <button className="logout-btn" onClick={() => {
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
              <h1>Admin Dashboard</h1>
              <p className="header-subtitle">System overview and management</p>
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

        {loading ? (
          <div className="loading-spinner">Loading dashboard data...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon users">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalUsers || 0}</div>
                  <div className="stat-label">Total Users</div>
                </div>
              </div>

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
                <div className="stat-icon clients">
                  <i className="fas fa-user-tie"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalClients || 0}</div>
                  <div className="stat-label">Clients</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon suppliers">
                  <i className="fas fa-truck"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalSuppliers || 0}</div>
                  <div className="stat-label">Suppliers</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon revenue">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">₱{(stats.totalRevenue || 0).toLocaleString()}</div>
                  <div className="stat-label">Total Revenue</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon inventory">
                  <i className="fas fa-boxes"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">₱{(stats.totalInventoryValue || 0).toLocaleString()}</div>
                  <div className="stat-label">Inventory Value</div>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="two-column-layout">
              {/* Left Column */}
              <div>
                {/* Recent Projects - REMOVED View Details Button */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-project-diagram"></i> Recent Projects</h3>
                    <Link to="/projects" className="view-all">View All Projects →</Link>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>Budget</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentProjects.length > 0 ? (
                          recentProjects.map(project => (
                            <tr key={project.project_id}>
                              <td>
                                <div className="project-name">{project.project_name}</div>
                                <div className="project-type">{project.project_type || 'Not specified'}</div>
                              </td>
                              <td>
                                {project.client_name && project.client_name !== 'Unknown' ? (
                                  <span className="client-name">
                                    <i className="fas fa-user"></i> {project.client_name}
                                  </span>
                                ) : (
                                  <span className="client-name unknown">No client assigned</span>
                                )}
                              </td>
                              <td>
                                <span className={`status-badge status-${project.status}`}>
                                  {project.status?.replace('_', ' ') || 'planning'}
                                </span>
                              </td>
                              <td>₱{Number(project.total_contract_amount || 0).toLocaleString()}</td>
                              <td>
                                <div className="action-buttons">
                                  <button 
                                    className="action-btn upload-btn"
                                    onClick={() => handleUploadDocument(project)}
                                    title="Upload Document"
                                  >
                                    <i className="fas fa-upload"></i> Upload
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center">No projects found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* System Health */}
                <div className="dashboard-section">
                  <h3><i className="fas fa-heartbeat"></i> System Health</h3>
                  
                  <div className="health-item">
                    <div className="health-label">
                      <span>Active Projects</span>
                      <span className="health-value success">{stats.activeProjects || 0}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{width: `${Math.min(100, ((stats.activeProjects || 0) / Math.max(1, (stats.totalProjects || 1))) * 100)}%`}}></div>
                    </div>
                  </div>

                  <div className="health-item">
                    <div className="health-label">
                      <span>Low Stock Items</span>
                      <span className={`health-value ${(stats.lowStockCount || 0) > 0 ? 'warning' : 'success'}`}>
                        {stats.lowStockCount || 0}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill warning" style={{width: `${Math.min(100, ((stats.lowStockCount || 0) / 50) * 100)}%`}}></div>
                    </div>
                  </div>

                  <div className="health-item">
                    <div className="health-label">
                      <span>Pending Inquiries</span>
                      <span className={`health-value ${(stats.pendingInquiries || 0) > 0 ? 'danger' : 'success'}`}>
                        {stats.pendingInquiries || 0}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill danger" style={{width: `${Math.min(100, ((stats.pendingInquiries || 0) / 20) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>

                {/* Recent Users */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-user-clock"></i> Recent Users</h3>
                    <Link to="/manage-users" className="view-all">View All Users →</Link>
                  </div>
                  <div className="recent-users-list">
                    {recentUsers.length > 0 ? (
                      recentUsers.map(user => (
                        <div key={user._id} className="recent-user-item">
                          <div className="user-avatar-small">
                            {user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-fullname">{user.full_name || user.username}</div>
                            <div className="user-meta">
                              {user.role} • {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                          <span className={`status-badge ${user.status === 'active' ? 'status-active' : 'status-pending'}`}>
                            {user.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center">No recent users</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Health Section - Matching Foreman Dashboard Style */}
            <div className="dashboard-section">
              <div className="section-header">
                <h3><i className="fas fa-chart-line"></i> Inventory Health</h3>
                <Link to="/inventory" className="view-all">View All →</Link>
              </div>
              
              <div className="inventory-health-grid">
                {/* Stock Summary Card */}
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                    <i className="fas fa-boxes"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.totalMaterials || 0}</div>
                    <div className="stat-label">Total Materials</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">₱{(stats.totalInventoryValue || 0).toLocaleString()}</div>
                    <div className="stat-label">Inventory Value</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{stats.lowStockCount || 0}</div>
                    <div className="stat-label">Low Stock Items</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                    <i className="fas fa-times-circle"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">{outOfStockItems.length || 0}</div>
                    <div className="stat-label">Out of Stock</div>
                  </div>
                </div>
              </div>

              {/* Low Stock Alerts */}
              {lowStockItems.length > 0 && (
                <div className="alert-section">
                  <h4><i className="fas fa-exclamation-triangle"></i> Low Stock Alerts</h4>
                  <div className="alerts-list">
                    {lowStockItems.slice(0, 5).map(item => (
                      <div key={item._id} className="alert-card">
                        <div className="alert-title">{item.material_name}</div>
                        <div className="alert-location">{item.location || 'No location'}</div>
                        <div className="alert-footer">
                          <div>
                            <span className="alert-quantity">{item.quantity} {item.unit}</span>
                            <div className="alert-min">Min: {item.min_stock_level}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Out of Stock Alerts */}
              {outOfStockItems.length > 0 && (
                <div className="alert-section critical">
                  <h4><i className="fas fa-skull-crosswalk"></i> Out of Stock - Critical</h4>
                  <div className="alerts-list">
                    {outOfStockItems.slice(0, 5).map(item => (
                      <div key={item._id} className="alert-card critical">
                        <div className="alert-title">{item.material_name}</div>
                        <div className="alert-location">{item.location || 'No location'}</div>
                        <div className="alert-footer">
                          <div>
                            <span className="alert-quantity critical">0 {item.unit}</span>
                            <div className="alert-min">Min: {item.min_stock_level}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Alerts State */}
              {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                <div className="empty-state small">
                  <div className="empty-icon">✅</div>
                  <p>All stock levels are good</p>
                </div>
              )}
            </div>

            {/* Recent Documents - Admin View with Delete */}
            <div className="dashboard-section">
              <div className="section-header">
                <h3><i className="fas fa-folder-open"></i> Recent Shared Documents</h3>
                <Link to="/admin-documents" className="view-all">Manage All →</Link>
              </div>
              
              {recentDocuments.length > 0 ? (
                <div className="documents-list">
                  {recentDocuments.slice(0, 5).map(doc => (
                    <div key={doc._id} className="document-card">
                      <div className="document-icon">
                        <i className={`fas ${getDocumentIcon(doc.document_type)}`}></i>
                      </div>
                      <div className="document-info">
                        <div className="document-name">{doc.document_name}</div>
                        <div className="document-project">{doc.project_name}</div>
                        <div className="document-meta">
                          <span className="document-type">{doc.document_type}</span>
                          <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                          <span>Shared by: {doc.uploaded_by_name || 'Admin'}</span>
                        </div>
                      </div>
                      <div className="document-actions">
                        <button
                          className="action-btn open-link-btn"
                          onClick={() => window.open(doc.file_url, '_blank')}
                          title="Open Link"
                        >
                          <i className="fas fa-external-link-alt"></i>
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteDocument(doc._id, doc.document_name)}
                          title="Delete Document"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state small">
                  <div className="empty-icon">📄</div>
                  <p>No documents shared yet. Upload documents from project management.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Document Upload Modal - Updated for links */}
      {showDocumentForm && selectedProjectForDoc && (
        <div className="modal-overlay" onClick={() => setShowDocumentForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Document Link - {selectedProjectForDoc.project_name}</h3>
              <button className="modal-close" onClick={() => setShowDocumentForm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="info-box" style={{ background: '#e0f2fe', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
                <i className="fas fa-info-circle" style={{ color: '#0284c7', marginRight: '10px' }}></i>
                <strong>Upload via Link:</strong> Paste a link from Google Drive, Mediafire, Pixeldrain, GoFile, or any cloud storage service.
                <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                  Examples:<br/>
                  • Google Drive: https://drive.google.com/file/d/...<br/>
                  • Mediafire: https://www.mediafire.com/file/...<br/>
                  • Pixeldrain: https://pixeldrain.com/u/...
                </div>
              </div>
              
              <form onSubmit={handleDocumentSubmit}>
                <div className="form-group">
                  <label className="required">Document Name</label>
                  <input
                    type="text"
                    value={documentFormData.document_name}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, document_name: e.target.value })}
                    required
                    placeholder="e.g., Building Permit, Floor Plan, Contract"
                  />
                </div>
                
                <div className="form-group">
                  <label className="required">Document Type</label>
                  <select 
                    value={documentFormData.document_type} 
                    onChange={(e) => setDocumentFormData({ ...documentFormData, document_type: e.target.value })}
                    required
                  >
                    {documentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="required">Document Link (URL)</label>
                  <input
                    type="url"
                    value={documentFormData.file_url}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, file_url: e.target.value })}
                    required
                    placeholder="https://drive.google.com/file/d/... or https://www.mediafire.com/..."
                  />
                  <small className="help-text">Paste the shareable link to your document</small>
                </div>
                
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={documentFormData.description}
                    onChange={(e) => setDocumentFormData({ ...documentFormData, description: e.target.value })}
                    rows="3"
                    placeholder="Brief description of the document"
                  ></textarea>
                </div>
                
                <div className="btn-group">
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-link"></i> Share Document Link
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowDocumentForm(false)}>
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;
// DashboardForeman.js - Fixed version

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { dashboardAPI } from './api';
import NotificationBadge from './NotificationBadge';
import NotificationCenter from './NotificationCenter';
import notificationService from './notificationService';
import './DashboardForeman.css';

const DashboardForeman = ({ username, fullName, onLogout }) => {
  const API_URL = 'http://localhost:5000/api';
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalMaterials: 0,
    lowStockItems: 0,
    recentIssues: 0
  });
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unviewedMaterialRequestsCount, setUnviewedMaterialRequestsCount] = useState(0);
  const [lastMaterialRequestsViewed, setLastMaterialRequestsViewed] = useState(null);
  const [unviewedProcessedRequestsCount, setUnviewedProcessedRequestsCount] = useState(0);
  const [unviewedTasksCount, setUnviewedTasksCount] = useState(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [recentStockOut, setRecentStockOut] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [selectedProjectForProgress, setSelectedProjectForProgress] = useState(null);
  const [deletingStockId, setDeletingStockId] = useState(null);
  const [progressFormData, setProgressFormData] = useState({
    phase: 'construction',
    percentage: '',
    description: '',
    progress_date: new Date().toISOString().split('T')[0]
  });

  const progressPhases = [
    { value: 'planning', label: '📋 Planning' },
    { value: 'site_preparation', label: '🏗️ Site Preparation' },
    { value: 'foundation', label: '🏢 Foundation' },
    { value: 'structural', label: '🏛️ Structural' },
    { value: 'roofing', label: '🏠 Roofing' },
    { value: 'electrical', label: '⚡ Electrical' },
    { value: 'plumbing', label: '🚰 Plumbing' },
    { value: 'finishing', label: '🎨 Finishing' },
    { value: 'turnover', label: '🔑 Turnover' }
  ];

  // FIXED: Added arrow function syntax
  useEffect(() => {
    const init = async () => {
      const userId = localStorage.getItem('userId');
      // Initialize notification service with user ID
      await notificationService.syncWithBackend(userId);
      
      fetchDashboardData();
      fetchUnreadCount();
      fetchCounts();
      await fetchNotifications();
    };
    
    init();
    
    // Set up polling for new notifications
    const notificationInterval = setInterval(async () => {
      await notificationService.syncWithBackend(localStorage.getItem('userId'));
      setNotifications(notificationService.getNotifications());
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(notificationInterval);
    };
  }, []); // Empty dependency array - run once on mount

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

  const fetchCounts = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      // Get the last viewed timestamp for material requests
      const lastViewedResponse = await fetch(`${API_URL}/material-requests/foreman/${userId}/last-viewed`);
      const lastViewedData = await lastViewedResponse.json();
      const lastViewedAt = lastViewedData.lastViewedAt ? new Date(lastViewedData.lastViewedAt) : new Date(0);
      setLastMaterialRequestsViewed(lastViewedAt);
      
      // Get all material requests
      const requestsResponse = await fetch(`${API_URL}/material-requests/foreman/${userId}`);
      const requestsData = await requestsResponse.json();
      const pendingRequests = requestsData.requests?.filter(r => r.status === 'pending') || [];
      const processedRequests = requestsData.requests?.filter(r => r.status !== 'pending') || [];
      
      // Count unviewed pending requests
      const unviewedCount = pendingRequests.filter(r => 
        new Date(r.created_at) > lastViewedAt
      ).length;
      setUnviewedMaterialRequestsCount(unviewedCount);
      
      // Get last viewed for processed requests
      const lastProcessedResponse = await fetch(`${API_URL}/material-requests/foreman/${userId}/processed-last-viewed`);
      const lastProcessedData = await lastProcessedResponse.json();
      const lastProcessedAt = lastProcessedData.lastViewedAt ? new Date(lastProcessedData.lastViewedAt) : new Date(0);
      
      // Count unviewed processed requests (approved/rejected)
      const unviewedProcessed = processedRequests.filter(r => 
        r.processed_at && new Date(r.processed_at) > lastProcessedAt
      ).length;
      setUnviewedProcessedRequestsCount(unviewedProcessed);
      
      setPendingRequestsCount(pendingRequests.length);
      
      // Get UNVIEWED task requests (not just pending - any status change)
      const tasksResponse = await fetch(`${API_URL}/task-requests/foreman/${userId}/unviewed-count`);
      const tasksData = await tasksResponse.json();
      setUnviewedTasksCount(tasksData.count || 0);
      
      // Get open incidents
      const incidentsResponse = await fetch(`${API_URL}/safety/incidents?foreman_id=${userId}`);
      const incidentsData = await incidentsResponse.json();
      const open = incidentsData.incidents?.filter(i => i.status === 'open').length || 0;
      setOpenIncidentsCount(open);
      
      // Get pending tasks (actual tasks, not requests)
      const actualTasksResponse = await fetch(`${API_URL}/tasks/foreman/${userId}`);
      const actualTasksData = await actualTasksResponse.json();
      const pendingTasks = actualTasksData.tasks?.filter(t => t.status === 'pending').length || 0;
      setPendingTasksCount(pendingTasks);
      
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const data = await dashboardAPI.getForeman(userId);
      setStats(data.stats);
      setProjects(data.projects || []);
      setLowStock(data.lowStock || []);
      setRecentStockOut(data.recentStockOut || []);
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

  // Simplified fetchNotifications
  const fetchNotifications = async () => {
    try {
      // Notifications are already synced via the interval
      setNotifications(notificationService.getNotifications());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Update mark as read handler
  const handleMarkAsRead = async (notificationId) => {
    if (notificationId === 'all') {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    }
  };

  // Update clear all handler
  const handleClearAll = async () => {
    await notificationService.clearAll();
    setNotifications([]);
  };

  // Update the notification click handler
  const handleNotificationClick = async (notification) => {
    // Mark as read in the service (which will sync to backend)
    await notificationService.markAsRead(notification.id);
    
    // Update local state
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ));
    
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/view-project/${projectId}`);
  };

  const handleDailyReport = (projectId) => {
    navigate(`/daily-reports?project_id=${projectId}`);
  };

  const handleMaterialRequest = (projectId) => {
    navigate(`/material-requests?project_id=${projectId}`);
  };

  // Add stock details view function
  const handleViewStockDetails = (stock) => {
    Swal.fire({
      title: 'Stock Issue Details',
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.8rem; opacity: 0.9;">Material Issued</div>
                <div style="font-size: 1.3rem; font-weight: bold;">${stock.material_name}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.8rem; opacity: 0.9;">Quantity</div>
                <div style="font-size: 1.8rem; font-weight: bold;">${stock.quantity}</div>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-calendar"></i> Issue Date
              </div>
              <div style="font-weight: 600;">${new Date(stock.date_issued).toLocaleDateString()}</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-hard-hat"></i> Project
              </div>
              <div style="font-weight: 600;">${stock.project_name || 'General Use'}</div>
            </div>
          </div>
          
          ${stock.purpose ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <div style="color: #92400e; font-size: 0.8rem; margin-bottom: 8px;">
                <i class="fas fa-clipboard-list"></i> Purpose
              </div>
              <div style="color: #78350f;">${stock.purpose}</div>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; display: flex; justify-content: space-between; color: #64748b; font-size: 0.75rem;">
            <span><i class="fas fa-hashtag"></i> Reference: #${stock.stockout_id?.slice(-6)}</span>
            <span><i class="fas fa-user"></i> Issued by: ${stock.issued_by_name || 'System'}</span>
          </div>
        </div>
      `,
      width: '550px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#667eea',
      showCancelButton: false
    });
  };

  // Add delete stock issue function
  const handleDeleteStockIssue = async (stock) => {
    const result = await Swal.fire({
      title: 'Delete Stock Issue Record?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Delete stock issue for:<br>
            <strong>"${stock.material_name}"</strong>
          </p>
          <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #92400e;">Quantity:</span>
              <span style="font-weight: bold; color: #ef4444;">-${stock.quantity}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #92400e;">Project:</span>
              <span style="font-weight: bold;">${stock.project_name || 'General Use'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 5px;">
              <span style="color: #92400e;">Date:</span>
              <span>${new Date(stock.date_issued).toLocaleDateString()}</span>
            </div>
          </div>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This action cannot be undone!
          </p>
          <p style="color: #64748b; font-size: 0.85rem; margin-top: 10px;">
            This will permanently remove this record from your stock history.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete Record',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setDeletingStockId(stock.stockout_id);
      try {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        
        const response = await fetch(`${API_URL}/stock/out/${stock.stockout_id}`, {
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
            text: 'Stock issue record has been deleted successfully.',
            timer: 1500
          });
          
          // Refresh the recent stock issues
          const userId = localStorage.getItem('userId');
          const stockResponse = await fetch(`${API_URL}/stock/out/recent?limit=5&foremanId=${userId}`);
          const stockData = await stockResponse.json();
          setRecentStockOut(stockData.stockOut || []);
        } else {
          throw new Error(data.message || 'Delete failed');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete stock issue record'
        });
      } finally {
        setDeletingStockId(null);
      }
    }
  };

  // Add clear all stock issues function
  const handleClearAllStockIssues = async () => {
    if (recentStockOut.length === 0) return;
    
    const result = await Swal.fire({
      title: 'Clear All Stock Issues?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Clear all ${recentStockOut.length} stock issue record(s)?
          </p>
          <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin: 15px 0;">
            <p style="color: #92400e; font-size: 0.9rem;">
              <i class="fas fa-info-circle"></i> This will permanently delete all stock issue records from your recent history.
            </p>
          </div>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This action cannot be undone!
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Clear All',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      setDeletingStockId('all');
      let successCount = 0;
      let failCount = 0;
      
      for (const stock of recentStockOut) {
        try {
          const userId = localStorage.getItem('userId');
          const userRole = localStorage.getItem('userRole');
          const username = localStorage.getItem('username');
          
          const response = await fetch(`${API_URL}/stock/out/${stock.stockout_id}`, {
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
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }
      
      Swal.fire({
        icon: successCount > 0 ? 'success' : 'error',
        title: 'Operation Complete',
        html: `
          <p>Successfully deleted: ${successCount} record(s)</p>
          ${failCount > 0 ? `<p style="color: #ef4444;">Failed to delete: ${failCount} record(s)</p>` : ''}
        `,
        timer: 2000
      });
      
      // Refresh the recent stock issues
      const userId = localStorage.getItem('userId');
      const stockResponse = await fetch(`${API_URL}/stock/out/recent?limit=5&foremanId=${userId}`);
      const stockData = await stockResponse.json();
      setRecentStockOut(stockData.stockOut || []);
      setDeletingStockId(null);
    }
  };

  const handleAddProgress = (project) => {
    setSelectedProjectForProgress(project);
    setProgressFormData({
      phase: 'construction',
      percentage: project.progress || 0,
      description: '',
      progress_date: new Date().toISOString().split('T')[0]
    });
    setShowProgressForm(true);
  };

  const handleProgressSubmit = async (e) => {
    e.preventDefault();
    
    if (!progressFormData.description) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Description',
        text: 'Please provide a description of the progress'
      });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectForProgress.project_id,
          phase: progressFormData.phase,
          percentage: parseFloat(progressFormData.percentage),
          description: progressFormData.description,
          progress_date: progressFormData.progress_date,
          reported_by: localStorage.getItem('userId'),
          username: username
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Progress Added!',
          text: 'Progress update has been added successfully.',
          timer: 1500
        });
        
        setShowProgressForm(false);
        setSelectedProjectForProgress(null);
        fetchDashboardData(); // Refresh dashboard data
      } else {
        throw new Error(data.message || 'Failed to add progress');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add progress update'
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="dashboard-container">
      {/* Hamburger Menu Button */}
      <button className={`hamburger-menu foreman-toggle ${sidebarOpen ? 'active' : ''}`} onClick={toggleSidebar}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      {/* Sidebar */}
      <div className={`sidebar foreman-sidebar ${sidebarOpen ? 'active' : ''}`} id="sidebar">
        <div className="logo">
          <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          <h2>ArCreate</h2>
        </div>

        <div className="user-info">
          <div className="user-avatar foreman-avatar">
            {fullName ? fullName.charAt(0).toUpperCase() : username?.charAt(0).toUpperCase()}
          </div>
          <div className="user-name">{fullName || username}</div>
          <div className="user-role">Site Foreman</div>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/inventory" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-warehouse"></i>
              <span>Inventory</span>
              {stats.lowStockItems > 0 && (
                <NotificationBadge 
                  count={stats.lowStockItems} 
                  variant="warning" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/projects" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-hard-hat"></i>
              <span>My Projects</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/workers" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-users"></i>
              <span>Workers</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/daily-reports" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-clipboard-list"></i>
              <span>Daily Reports</span>
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/material-requests" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-truck-loading"></i>
              <span>Material Requests</span>
              {(unviewedMaterialRequestsCount > 0 || unviewedProcessedRequestsCount > 0) && (
                <NotificationBadge 
                  count={unviewedMaterialRequestsCount + unviewedProcessedRequestsCount} 
                  variant={unviewedMaterialRequestsCount > 0 ? "warning" : "info"} 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/safety" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-shield-alt"></i>
              <span>Safety</span>
              {openIncidentsCount > 0 && (
                <NotificationBadge 
                  count={openIncidentsCount} 
                  variant="danger" 
                  pulse={true}
                />
              )}
            </Link>
          </li>
          
          <li className="nav-item">
            <Link to="/task-management" className="nav-link" onClick={closeSidebar}>
              <i className="fas fa-tasks"></i>
              <span>Task Management</span>
              {unviewedTasksCount > 0 && (
                <NotificationBadge 
                  count={unviewedTasksCount} 
                  variant="primary" 
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

        <button className="logout-btn foreman-logout" onClick={() => {
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
              <h1>Foreman Dashboard</h1>
              <p className="header-subtitle">Site management and material tracking</p>
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
        <div className="welcome-section foreman-welcome">
          <div className="welcome-content">
            <div className="welcome-icon">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="welcome-text">
              <h2>Welcome, {fullName || username}!</h2>
              <p>Manage your construction site efficiently</p>
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
                  <i className="fas fa-hard-hat"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeProjects || 0}</div>
                  <div className="stat-label">Active Projects</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon materials">
                  <i className="fas fa-boxes"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalMaterials || 0}</div>
                  <div className="stat-label">Total Materials</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon low">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.lowStockItems || 0}</div>
                  <div className="stat-label">Low Stock Items</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stock">
                  <i className="fas fa-truck"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.recentIssues || 0}</div>
                  <div className="stat-label">Recent Issues</div>
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
                    <h3><i className="fas fa-hard-hat"></i> My Active Projects</h3>
                    <Link to="/projects" className="view-all">View All →</Link>
                  </div>
                  
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <div key={project.project_id} className="project-card">
                        <div className="project-header">
                          <div>
                            <h4 className="project-title">{project.project_name}</h4>
                            <div className="client-info">
                              <i className="fas fa-user"></i>
                              Client: {project.client_name && project.client_name !== 'Not assigned'
                                ? project.client_name
                                : 'No client assigned'}
                            </div>
                          </div>
                          <span className={`project-status status-${project.status}`}>
                            {project.status?.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="project-details">
                          <div>
                            <div className="detail-item">
                              <i className="fas fa-map-marker-alt"></i> {project.address || 'Address not specified'}
                            </div>
                            <div className="detail-item">
                              <strong>Start:</strong> {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                            </div>
                          </div>
                          <div>
                            <div className="detail-item">
                              <strong>Est. End:</strong> {project.estimated_end_date ? new Date(project.estimated_end_date).toLocaleDateString() : 'Not set'}
                            </div>
                            {project.client_phone && (
                              <div className="detail-item">
                                <i className="fas fa-phone"></i> {project.client_phone}
                              </div>
                            )}
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
                            onClick={() => handleDailyReport(project.project_id)}
                          >
                            <i className="fas fa-clipboard-list"></i> Report
                          </button>
                          <button 
                            className="btn btn-success"
                            onClick={() => handleMaterialRequest(project.project_id)}
                          >
                            <i className="fas fa-truck-loading"></i> Request
                          </button>
                          <button 
                            className="btn btn-info"
                            onClick={() => handleAddProgress(project)}
                          >
                            <i className="fas fa-chart-line"></i> Add Progress
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon">🏗️</div>
                      <h3>No Active Projects</h3>
                      <p>You are not assigned to any active projects.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div>
                {/* Low Stock Alerts */}
                <div className="dashboard-section">
                  <h3><i className="fas fa-exclamation-triangle"></i> Low Stock Alerts</h3>
                  
                  {lowStock.length > 0 ? (
                    <div className="alerts-list">
                      {lowStock.map(item => (
                        <div key={item.material_id} className="alert-card">
                          <div className="alert-title">{item.material_name}</div>
                          <div className="alert-location">{item.location}</div>
                          <div className="alert-footer">
                            <div>
                              <span className="alert-quantity">{item.quantity} {item.unit}</span>
                              <div className="alert-min">Min: {item.min_stock_level}</div>
                            </div>
                          </div>
                          <div className="alert-note" style={{ marginTop: '10px', fontSize: '0.8rem', color: '#f59e0b' }}>
                            <i className="fas fa-info-circle"></i> Please submit a material request to restock this item
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">✅</div>
                      <p>All stock levels are good</p>
                    </div>
                  )}
                </div>

                {/* Recent Stock Issues - Redesigned with Delete */}
                <div className="dashboard-section">
                  <div className="section-header">
                    <h3><i className="fas fa-truck-fast"></i> Recent Stock Issues</h3>
                    <div className="section-actions">
                      {recentStockOut.length > 0 && (
                        <button
                          className="clear-all-stock-btn"
                          onClick={() => handleClearAllStockIssues()}
                          title="Clear all stock issues"
                        >
                          <i className="fas fa-trash-alt"></i> Clear All
                        </button>
                      )}
                      <Link to="/material-requests" className="view-all">View All →</Link>
                    </div>
                  </div>

                  {recentStockOut.length > 0 ? (
                    <div className="stock-issues-grid">
                      {recentStockOut.map(stock => (
                        <div key={stock.stockout_id} className={`stock-issue-card ${deletingStockId === stock.stockout_id ? 'deleting' : ''}`}>
                          <div className="stock-issue-header">
                            <div className="stock-issue-icon">
                              <i className="fas fa-box-open"></i>
                            </div>
                            <div className="stock-issue-title">
                              <h4>{stock.material_name}</h4>
                              <span className="stock-issue-date">
                                <i className="fas fa-calendar-alt"></i> {new Date(stock.date_issued).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="stock-quantity-badge">
                              <span className="quantity-number">-{stock.quantity}</span>
                              <span className="quantity-unit">{stock.unit || 'pcs'}</span>
                            </div>
                          </div>

                          <div className="stock-issue-body">
                            <div className="stock-project-info">
                              <i className="fas fa-hard-hat"></i>
                              <span>{stock.project_name || 'General Use'}</span>
                            </div>

                            {stock.purpose && (
                              <div className="stock-purpose-info">
                                <i className="fas fa-info-circle"></i>
                                <span>{stock.purpose.length > 60 ? stock.purpose.substring(0, 60) + '...' : stock.purpose}</span>
                              </div>
                            )}

                            <div className="stock-issue-footer">
                              <div className="stock-status-indicator">
                                <span className="status-dot issued"></span>
                                <span>Issued</span>
                              </div>
                              <div className="stock-actions">
                                <button
                                  className="view-details-stock-btn"
                                  onClick={() => handleViewStockDetails(stock)}
                                >
                                  <i className="fas fa-eye"></i> Details
                                </button>
                                <button
                                  className="delete-stock-btn"
                                  onClick={() => handleDeleteStockIssue(stock)}
                                  disabled={deletingStockId === stock.stockout_id}
                                  title="Delete this record"
                                >
                                  <i className={`fas ${deletingStockId === stock.stockout_id ? 'fa-spinner fa-spin' : 'fa-trash-alt'}`}></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <div className="empty-icon">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <p>No recent stock issues</p>
                      <span className="empty-subtext">All stock movements are recorded here</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Progress Update Modal */}
      {showProgressForm && selectedProjectForProgress && (
        <div className="modal-overlay" onClick={() => setShowProgressForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Progress Update - {selectedProjectForProgress.project_name}</h3>
              <button className="modal-close" onClick={() => setShowProgressForm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleProgressSubmit}>
                <div className="form-group">
                  <label className="required">Progress Phase</label>
                  <select 
                    value={progressFormData.phase} 
                    onChange={(e) => setProgressFormData({ ...progressFormData, phase: e.target.value })}
                    required
                  >
                    {progressPhases.map(phase => (
                      <option key={phase.value} value={phase.value}>{phase.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="required">Completion Percentage (%)</label>
                  <input
                    type="number"
                    value={progressFormData.percentage}
                    onChange={(e) => setProgressFormData({ ...progressFormData, percentage: e.target.value })}
                    required
                    min="0"
                    max="100"
                    step="1"
                  />
                  <small className="help-text">Current project progress: {selectedProjectForProgress.progress || 0}%</small>
                </div>
                
                <div className="form-group">
                  <label className="required">Date</label>
                  <input
                    type="date"
                    value={progressFormData.progress_date}
                    onChange={(e) => setProgressFormData({ ...progressFormData, progress_date: e.target.value })}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <label className="required">Progress Description</label>
                  <textarea
                    value={progressFormData.description}
                    onChange={(e) => setProgressFormData({ ...progressFormData, description: e.target.value })}
                    required
                    rows="4"
                    placeholder="Describe what work has been completed, milestones achieved, etc."
                  ></textarea>
                </div>
                
                <div className="btn-group">
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save"></i> Add Progress Update
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowProgressForm(false)}>
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

export default DashboardForeman;
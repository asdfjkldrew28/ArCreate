// ActivityLogs.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './ActivityLogs.css';

const API_URL = 'http://localhost:5000/api';

const ActivityLogs = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, dateRange, userFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/logs`);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load activity logs'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`);
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];
    
    filtered = filtered.filter(log => 
      new Date(log.timestamp) >= new Date(dateRange.start) &&
      new Date(log.timestamp) <= new Date(dateRange.end)
    );
    
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.user_id === userFilter);
    }
    
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    
    setFilteredLogs(filtered);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: '#10b981',
      UPDATE: '#3b82f6',
      DELETE: '#ef4444',
      LOGIN: '#8b5cf6',
      LOGOUT: '#6b7280',
      VIEW: '#f59e0b'
    };
    return colors[action] || '#6b7280';
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

  const handleRefresh = () => {
    fetchLogs();
  };

  return (
    <div className="logs-container">
      <div className="logs-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div>
              <h1>Activity Logs</h1>
              <p className="header-subtitle">System audit trail and user activities</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleRefresh}>
              <i className="fas fa-sync-alt"></i> Refresh
            </button>
            <button className="logout-btn-small" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-range">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="date-input"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>User</label>
            <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="user-filter">
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.full_name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Action</label>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="action-filter">
              <option value="all">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="VIEW">View</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="loading-spinner">Loading logs...</div>
        ) : (
          <div className="table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-small">{log.user_name?.charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="user-name">{log.user_name}</div>
                            <div className="user-role">{log.user_role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="action-badge" style={{ 
                          background: `${getActionColor(log.action)}20`, 
                          color: getActionColor(log.action) 
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td>{log.description}</td>
                      <td>{log.ip_address || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">
                      <div className="empty-state">
                        <i className="fas fa-clipboard-list empty-icon"></i>
                        <h3>No Logs Found</h3>
                        <p>No activity logs match your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
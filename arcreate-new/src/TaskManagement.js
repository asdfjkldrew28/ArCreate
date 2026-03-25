// TaskManagement.js - Fixed version with proper project filtering

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import './TaskManagement.css';

const API_URL = 'http://localhost:5000/api';

const TaskManagement = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromUrl = queryParams.get('project_id');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromUrl || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    approvedTasks: 0,
    rejectedTasks: 0
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: projectIdFromUrl || '',
    task_name: '',
    description: '',
    assigned_to: '',
    priority: 'medium',
    due_date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
    notes: ''
  });

  const [workers, setWorkers] = useState([]);

  const handleBack = () => {
    navigate(-1);
  };

  const fetchProjects = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/projects/foreman/${userId}`);
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${API_URL}/workers`);
      const data = await response.json();
      setWorkers(data.workers || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchTaskRequests = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      let url = `${API_URL}/task-requests/foreman/${userId}`;
      
      if (selectedProject !== 'all') {
        url += `?project_id=${selectedProject}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Format tasks with proper project_id matching
      const formattedTasks = (data.requests || []).map(request => ({
        _id: request._id,
        task_name: request.task_name,
        description: request.description,
        project_id: request.project_id?._id || request.project_id, // Handle populated vs string
        project_name: request.project_name,
        assigned_to: request.assigned_to,
        assigned_to_name: request.assigned_to_name || 'Unassigned',
        priority: request.priority,
        due_date: request.due_date,
        status: request.status,
        request_status: request.status,
        created_at: request.created_at,
        processed_at: request.processed_at,
        processed_by_name: request.processed_by_name,
        rejection_reason: request.rejection_reason,
        notes: request.notes,
        is_request: true
      }));
      
      setTasks(formattedTasks);
      calculateStats(formattedTasks);
      
      // Mark as viewed after fetching
      await markTasksAsViewed();
    } catch (error) {
      console.error('Error fetching task requests:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load task requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const markTasksAsViewed = async () => {
    try {
      const userId = localStorage.getItem('userId');
      await fetch(`${API_URL}/task-requests/update-last-viewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foreman_id: userId })
      });
    } catch (error) {
      console.error('Error marking tasks as viewed:', error);
    }
  };

  const calculateStats = (tasksList) => {
    const pending = tasksList.filter(t => t.request_status === 'pending').length;
    const approved = tasksList.filter(t => t.request_status === 'approved').length;
    const rejected = tasksList.filter(t => t.request_status === 'rejected').length;
    
    setStats({
      totalTasks: tasksList.length,
      pendingTasks: pending,
      approvedTasks: approved,
      rejectedTasks: rejected
    });
  };

  // Filter tasks when dependencies change
  useEffect(() => {
    filterTasks();
  }, [tasks, selectedProject, statusFilter]);

  const filterTasks = () => {
    let filtered = [...tasks];
    
    // Filter by project - FIX: Convert both to strings for comparison
    if (selectedProject !== 'all') {
      filtered = filtered.filter(task => {
        // Handle both ObjectId and string formats
        const taskProjectId = task.project_id?.toString() || task.project_id;
        const selectedProjectId = selectedProject.toString();
        return taskProjectId === selectedProjectId;
      });
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.request_status === statusFilter);
    }
    
    setFilteredTasks(filtered);
  };

  useEffect(() => {
    fetchProjects();
    fetchWorkers();
  }, []);

  useEffect(() => {
    fetchTaskRequests();
  }, [selectedProject]); // Refetch when project changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.description.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Description',
        text: 'Task description is required'
      });
      return;
    }

    if (!formData.task_name || !formData.task_name.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Task Name',
        text: 'Task name is required'
      });
      return;
    }

    if (!formData.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Submitting Task for Approval...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const selectedProject = projects.find(p => p.project_id === formData.project_id);
      const selectedWorker = workers.find(w => w._id === formData.assigned_to);

      const response = await fetch(`${API_URL}/task-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project_name: selectedProject?.project_name,
          assigned_to_name: selectedWorker?.full_name,
          foreman_id: localStorage.getItem('userId'),
          foreman_name: fullName || username,
          request_number: `TASK-${Date.now().toString().slice(-8)}`,
          created_at: new Date()
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Request Submitted!',
          text: 'Task request has been submitted for admin approval.',
          timer: 2000
        });
        
        // Reset form
        setFormData({
          project_id: selectedProject !== 'all' ? selectedProject : '',
          task_name: '',
          description: '',
          assigned_to: '',
          priority: 'medium',
          due_date: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0],
          notes: ''
        });
        setShowForm(false);
        
        // Refresh the task list
        fetchTaskRequests();
      } else {
        throw new Error(data.message || 'Failed to submit request');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit task request'
      });
    }
  };

  const handleCancelRequest = async (requestId) => {
    const result = await Swal.fire({
      title: 'Cancel Request?',
      text: 'Are you sure you want to cancel this task request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_URL}/task-requests/${requestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' })
        });

        const data = await response.json();

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Cancelled',
            text: 'Task request has been cancelled',
            timer: 1500
          });
          fetchTaskRequests();
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to cancel request'
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

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626'
    };
    return colors[priority] || '#6b7280';
  };

  const getRequestStatusBadge = (status) => {
    switch(status) {
      case 'pending':
        return <span className="status-badge request-pending">⏳ Pending Approval</span>;
      case 'approved':
        return <span className="status-badge request-approved">✅ Approved</span>;
      case 'rejected':
        return <span className="status-badge request-rejected">❌ Rejected</span>;
      case 'cancelled':
        return <span className="status-badge request-cancelled">🗑️ Cancelled</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="tasks-container">
      <div className="tasks-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-tasks"></i>
            </div>
            <div>
              <h1>Task Management</h1>
              <p className="header-subtitle">Request new tasks for admin approval</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-value">{stats.totalTasks}</div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{stats.pendingTasks}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.approvedTasks}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-value">{stats.rejectedTasks}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar-container">
          <div className="action-bar">
            <div className="action-buttons-group">
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
                {showForm ? 'Cancel' : 'Request New Task'}
              </button>
              
              <button className="btn btn-secondary" onClick={() => fetchTaskRequests()}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
            </div>

            <div className="filters-group">
              <div className="filter-group">
                <label>Project:</label>
                <select 
                  value={selectedProject} 
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="project-filter"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Task Form */}
        {showForm && (
          <div className="task-form-section">
            <h3>Request New Task</h3>
            <form onSubmit={handleSubmit} className="task-form">
              <div className="form-group">
                <label className="required">Project</label>
                <select 
                  name="project_id" 
                  value={formData.project_id} 
                  onChange={handleInputChange} 
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">Task Name</label>
                <input
                  type="text"
                  name="task_name"
                  value={formData.task_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Install electrical wiring"
                />
              </div>

              <div className="form-group">
                <label className="required">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Detailed task description..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Assign To</label>
                  <select 
                    name="assigned_to" 
                    value={formData.assigned_to} 
                    onChange={handleInputChange} 
                    required
                  >
                    <option value="">Select Worker</option>
                    {workers.map(w => (
                      <option key={w._id} value={w._id}>
                        {w.full_name} - {w.position}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="required">Priority</label>
                  <select 
                    name="priority" 
                    value={formData.priority} 
                    onChange={handleInputChange} 
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="form-group">
                  <label>Additional Notes</label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-paper-plane"></i> Submit for Approval
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List */}
        <div className="tasks-list">
          {loading ? (
            <div className="loading-spinner">Loading task requests...</div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <div key={task._id} className="task-card">
                <div className="task-header">
                  <h3 className="task-title">{task.task_name}</h3>
                  <span className="task-project">{task.project_name}</span>
                </div>
                
                <p className="task-description">{task.description}</p>
                
                <div className="task-details">
                  <div className="task-detail">
                    <i className="fas fa-user"></i> {task.assigned_to_name}
                  </div>
                  <div className="task-detail">
                    <i className="fas fa-calendar"></i> Due: {new Date(task.due_date).toLocaleDateString()}
                  </div>
                  <div className="task-detail">
                    <i className="fas fa-flag" style={{ color: getPriorityColor(task.priority) }}></i>
                    {task.priority}
                  </div>
                  {task.notes && (
                    <div className="task-detail full-width">
                      <i className="fas fa-sticky-note"></i> Notes: {task.notes}
                    </div>
                  )}
                </div>
                
                <div className="task-footer">
                  <div className="task-status">
                    {getRequestStatusBadge(task.request_status)}
                  </div>
                  <div className="task-date-info">
                    <span className="task-date">
                      <i className="fas fa-clock"></i> 
                      Requested: {new Date(task.created_at).toLocaleDateString()}
                    </span>
                    {task.processed_at && (
                      <span className="task-date">
                        <i className="fas fa-check-circle"></i> 
                        Processed: {new Date(task.processed_at).toLocaleDateString()}
                        {task.processed_by_name && ` by ${task.processed_by_name}`}
                      </span>
                    )}
                    {task.rejection_reason && task.request_status === 'rejected' && (
                      <span className="rejection-reason">
                        <i className="fas fa-info-circle"></i> 
                        Reason: {task.rejection_reason}
                      </span>
                    )}
                  </div>
                  {task.request_status === 'pending' && (
                    <button 
                      className="btn-cancel"
                      onClick={() => handleCancelRequest(task._id)}
                    >
                      <i className="fas fa-times"></i> Cancel Request
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <i className="fas fa-clipboard-list"></i>
              </div>
              <h3>No Task Requests Found</h3>
              <p>
                {selectedProject !== 'all' 
                  ? `No task requests for the selected project.` 
                  : 'Submit your first task request for approval'}
              </p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <i className="fas fa-plus"></i> Request New Task
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
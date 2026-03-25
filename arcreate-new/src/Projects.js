import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { projectsAPI, clientsAPI, usersAPI } from './api';
import './Projects.css';

const Projects = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalValue: 0
  });

  // For admin - clients and foremen lists
  const [clients, setClients] = useState([]);
  const [foremen, setForemen] = useState([]);
  
  // Form state for adding/editing project (Admin only)
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    project_name: '',
    project_type: 'residential',
    client_id: '',
    foreman_id: '',
    address: '',
    total_contract_amount: '',
    start_date: '',
    estimated_end_date: '',
    status: 'planning',
    description: ''
  });

  const projectTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'renovation', label: 'Renovation' }
  ];

  const projectStatuses = [
    { value: 'planning', label: 'Planning' },
    { value: 'construction', label: 'Construction' },
    { value: 'finishing', label: 'Finishing' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    fetchData();
  }, [userRole]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      let projectsData;
      
      // Fetch projects based on user role
      switch(userRole) {
        case 'admin':
          // Admin sees ALL projects
          projectsData = await projectsAPI.getAll();
          // Fetch clients and foremen for project assignment
          const clientsData = await clientsAPI.getAll();
          const usersData = await usersAPI.getAll();
          setClients(clientsData.clients || []);
          setForemen(usersData.users?.filter(u => u.role === 'foreman') || []);
          break;
          
        case 'foreman':
          // Foreman sees ONLY projects assigned to them
          projectsData = await projectsAPI.getByForeman(userId);
          break;
          
        case 'client':
          // Client sees ONLY their own projects
          projectsData = await projectsAPI.getByClient(userId);
          break;
          
        default:
          projectsData = { projects: [] };
      }
      
      setProjects(projectsData.projects || []);
      calculateStats(projectsData.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load projects'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsList) => {
    const totalProjects = projectsList.length;
    const activeProjects = projectsList.filter(p => 
      ['planning', 'construction', 'finishing'].includes(p.status)
    ).length;
    const completedProjects = projectsList.filter(p => p.status === 'completed').length;
    const totalValue = projectsList.reduce((sum, p) => sum + (p.total_contract_amount || 0), 0);

    setStats({
      totalProjects,
      activeProjects,
      completedProjects,
      totalValue
    });
  };

  const filterProjects = () => {
    let filtered = [...projects];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }
    
    setFilteredProjects(filtered);
  };

  // Admin functions for project management
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      project_type: 'residential',
      client_id: '',
      foreman_id: '',
      address: '',
      total_contract_amount: '',
      start_date: '',
      estimated_end_date: '',
      status: 'planning',
      description: ''
    });
    setEditingProject(null);
    setShowForm(false);
  };

  const validateDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.estimated_end_date);

    if (startDate < today) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Start Date',
        text: 'Start date cannot be in the past'
      });
      return false;
    }

    if (endDate < startDate) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid End Date',
        text: 'Estimated end date must be after start date'
      });
      return false;
    }

    return true;
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.client_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Client',
        text: 'Please select a client for this project'
      });
      return;
    }

    if (!formData.foreman_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Foreman',
        text: 'Please select a foreman for this project'
      });
      return;
    }

    if (parseFloat(formData.total_contract_amount) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Contract amount must be greater than 0'
      });
      return;
    }

    // Validate dates
    if (!validateDates()) {
      return;
    }

    try {
      await projectsAPI.create(formData, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Project created successfully!',
        timer: 1500
      });
      
      resetForm();
      fetchData(); // Refresh the list
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create project'
      });
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setFormData({
      project_name: project.project_name || '',
      project_type: project.project_type || 'residential',
      client_id: project.client_id || '',
      foreman_id: project.foreman_id || '',
      address: project.address || '',
      total_contract_amount: project.total_contract_amount || '',
      start_date: project.start_date ? project.start_date.split('T')[0] : '',
      estimated_end_date: project.estimated_end_date ? project.estimated_end_date.split('T')[0] : '',
      status: project.status || 'planning',
      description: project.description || ''
    });
    setShowForm(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    
    try {
      await projectsAPI.update(editingProject.project_id, formData, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Project updated successfully!',
        timer: 1500
      });
      
      resetForm();
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update project'
      });
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    const result = await Swal.fire({
      title: 'Delete Project?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px;">
            Delete project:<br>
            <strong>"${projectName}"</strong>?
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
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        await projectsAPI.delete(projectId, username, userRole);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Project has been deleted.',
          timer: 1500
        });
        fetchData();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Delete failed'
        });
      }
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleViewProject = (projectId) => {
    navigate(`/view-project/${projectId}`);
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: 'status-planning',
      construction: 'status-construction',
      finishing: 'status-finishing',
      completed: 'status-completed',
      on_hold: 'status-hold',
      cancelled: 'status-cancelled'
    };
    return colors[status] || 'status-planning';
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

  const getDashboardLink = () => {
    switch(userRole) {
      case 'admin': return '/dashboard-admin';
      case 'foreman': return '/dashboard-foreman';
      case 'client': return '/client-dashboard';
      default: return '/inventory';
    }
  };

  const getTitle = () => {
    switch(userRole) {
      case 'admin': return 'All Projects';
      case 'foreman': return 'My Assigned Projects';
      case 'client': return 'My Projects';
      default: return 'Projects';
    }
  };

  return (
    <div className="projects-container">
      <div className="projects-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-project-diagram"></i>
            </div>
            <div>
              <h1>{getTitle()}</h1>
              <p className="header-subtitle">
                {userRole === 'admin' && 'Create and manage all construction projects'}
                {userRole === 'foreman' && 'Projects assigned to you for supervision'}
                {userRole === 'client' && 'Your construction projects'}
              </p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-project-diagram"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalProjects}</div>
              <div className="stat-label">Total Projects</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeProjects}</div>
              <div className="stat-label">Active Projects</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.completedProjects}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon value">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">₱{stats.totalValue.toLocaleString()}</div>
              <div className="stat-label">Total Contract Value</div>
            </div>
          </div>
        </div>

        {/* Only Admin sees the Create Project button */}
        {userRole === 'admin' && (
          <div className="actions-bar">
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
              {showForm ? 'Cancel' : 'Create New Project'}
            </button>

            <div className="filters">
              <div className="search-box">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Status</option>
                {projectStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* For non-admin roles, show filters only */}
        {userRole !== 'admin' && (
          <div className="actions-bar">
            <div className="filters" style={{ width: '100%' }}>
              <div className="search-box">
                <i className="fas fa-search search-icon"></i>
                <input
                  type="text"
                  placeholder="Search your projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="all">All Status</option>
                {projectStatuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Project Creation Form - Only visible to Admin */}
        {showForm && userRole === 'admin' && (
          <div className="project-form-section">
            <h3>{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
            <p className="form-description">
              {editingProject 
                ? 'Update project details, client assignment, and foreman assignment'
                : 'Create a new project and assign it to a client and foreman'}
            </p>
            <form onSubmit={editingProject ? handleUpdateProject : handleAddProject} className="project-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Project Name</label>
                  <input
                    type="text"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Luxury Villa Construction"
                  />
                </div>
                <div className="form-group">
                  <label className="required">Project Type</label>
                  <select name="project_type" value={formData.project_type} onChange={handleInputChange} required>
                    {projectTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Client</label>
                  <select name="client_id" value={formData.client_id} onChange={handleInputChange} required>
                    <option value="">-- Select Client --</option>
                    {clients.map(client => (
                      <option key={client.user_id} value={client.user_id}>
                        {client.company_name || client.full_name} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                  <small className="help-text">This project will appear in the selected client's dashboard</small>
                </div>
                <div className="form-group">
                  <label className="required">Foreman</label>
                  <select name="foreman_id" value={formData.foreman_id} onChange={handleInputChange} required>
                    <option value="">-- Select Foreman --</option>
                    {foremen.map(foreman => (
                      <option key={foreman._id} value={foreman._id}>
                        {foreman.full_name}
                      </option>
                    ))}
                  </select>
                  <small className="help-text">This project will appear in the selected foreman's dashboard</small>
                </div>
              </div>

              <div className="form-group">
                <label className="required">Project Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  placeholder="Complete project address (required)"
                  required
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Contract Amount (₱)</label>
                  <input
                    type="number"
                    name="total_contract_amount"
                    value={formData.total_contract_amount}
                    onChange={handleInputChange}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label className="required">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} required>
                    {projectStatuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-group">
                  <label className="required">Estimated End Date</label>
                  <input
                    type="date"
                    name="estimated_end_date"
                    value={formData.estimated_end_date}
                    onChange={handleInputChange}
                    required
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Project Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Detailed description of the project scope"
                ></textarea>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> {editingProject ? 'Update Project' : 'Create Project'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Projects List - Visible to all roles */}
        {loading ? (
          <div className="loading-spinner">Loading projects...</div>
        ) : (
          <div className="projects-list">
            {filteredProjects.length > 0 ? (
              filteredProjects.map(project => (
                <div key={project.project_id} className="project-card">
                  <div className="project-header">
                    <div>
                      <h3 className="project-title">{project.project_name}</h3>
                      <div className="project-meta">
                        <span className="project-type">{project.project_type}</span>
                        {project.client_name && userRole !== 'client' && (
                          <span className="client-name">
                            <i className="fas fa-user"></i> Client: {project.client_name}
                          </span>
                        )}
                        {project.foreman_name && userRole === 'admin' && (
                          <span className="foreman-name">
                            <i className="fas fa-hard-hat"></i> Foreman: {project.foreman_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`project-status ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>

                  <div className="project-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{project.address || 'Address not specified'}</span>
                      </div>
                      <div className="detail-item">
                        <i className="fas fa-calendar"></i>
                        <span>
                          {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'TBD'}
                          {project.estimated_end_date && ` - ${new Date(project.estimated_end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <div className="detail-item contract-amount">
                        <i className="fas fa-money-bill-wave"></i>
                        <span>Contract: ₱{Number(project.total_contract_amount || 0).toLocaleString()}</span>
                      </div>
                      {userRole === 'client' && project.balance !== undefined && (
                        <div className="detail-item balance">
                          <i className="fas fa-credit-card"></i>
                          <span className={project.balance > 0 ? 'negative' : 'positive'}>
                            Balance: ₱{Math.abs(project.balance).toLocaleString()}
                            {project.balance > 0 ? ' (Due)' : ' (Paid)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {project.description && (
                      <div className="detail-item description">
                        <i className="fas fa-align-left"></i>
                        <span>{project.description.substring(0, 100)}...</span>
                      </div>
                    )}
                  </div>

                  <div className="project-footer">
                    <div className="progress-info">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${project.progress || 0}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{project.progress || 0}% Complete</span>
                    </div>

                    <div className="action-buttons">
                      <button 
                        className="action-btn view-btn"
                        onClick={() => handleViewProject(project.project_id)}
                      >
                        <i className="fas fa-eye"></i> View Details
                      </button>
                      
                      {/* Admin-only actions */}
                      {userRole === 'admin' && (
                        <>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditProject(project)}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteProject(project.project_id, project.project_name)}
                          >
                            <i className="fas fa-trash"></i> Delete
                          </button>
                        </>
                      )}

                      {/* Foreman-specific actions */}
                      {userRole === 'foreman' && (
                        <>
                          <button 
                            className="action-btn report-btn"
                            onClick={() => navigate(`/daily-reports?project_id=${project.project_id}`)}
                          >
                            <i className="fas fa-clipboard-list"></i> Daily Report
                          </button>
                          <button 
                            className="action-btn material-btn"
                            onClick={() => navigate(`/material-requests?project_id=${project.project_id}`)}
                          >
                            <i className="fas fa-truck-loading"></i> Request Materials
                          </button>
                        </>
                      )}

                      {/* Client-specific actions */}
                      {userRole === 'client' && (
                        <>
                          <button 
                            className="action-btn progress-btn"
                            onClick={() => navigate(`/progress-updates?project_id=${project.project_id}`)}
                          >
                            <i className="fas fa-chart-line"></i> View Progress
                          </button>
                          <button 
                            className="action-btn payment-btn"
                            onClick={() => navigate(`/payments?project_id=${project.project_id}`)}
                          >
                            <i className="fas fa-credit-card"></i> Make Payment
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-project-diagram"></i>
                </div>
                <h3>No Projects Found</h3>
                <p>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No projects match your search criteria.' 
                    : userRole === 'admin' 
                      ? 'Start by creating your first project.' 
                      : userRole === 'foreman'
                        ? 'No projects have been assigned to you yet. Please contact the admin.'
                        : 'You don\'t have any projects yet. Please contact us to start your project.'}
                </p>
                {userRole === 'admin' && (
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> Create Your First Project
                  </button>
                )}
                {(searchTerm || statusFilter !== 'all') && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    <i className="fas fa-times"></i> Clear Filters
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

export default Projects;
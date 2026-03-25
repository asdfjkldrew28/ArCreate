// ProgressUpdates.js - Complete working version with delete functionality

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { progressAPI, projectsAPI } from './api';
import './ProgressUpdates.css';

const API_URL = 'http://localhost:5000/api';

const ProgressUpdates = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updates, setUpdates] = useState([]);
  const [filteredUpdates, setFilteredUpdates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [stats, setStats] = useState({
    totalUpdates: 0,
    averageProgress: 0,
    projectsWithUpdates: 0,
    latestUpdate: null
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch client's projects
      const projectsData = await projectsAPI.getByClient(userId);
      setProjects(projectsData.projects || []);
      
      // Fetch all progress updates for client's projects
      let allUpdates = [];
      for (const project of projectsData.projects || []) {
        const updatesData = await progressAPI.getByProject(project.project_id);
        allUpdates = [...allUpdates, ...(updatesData.updates || [])];
      }
      
      // Sort by date (newest first)
      allUpdates.sort((a, b) => new Date(b.progress_date) - new Date(a.progress_date));
      
      setUpdates(allUpdates);
      calculateStats(allUpdates, projectsData.projects || []);
    } catch (error) {
      console.error('Error fetching progress updates:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load progress updates'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (updatesList, projectsList) => {
    const totalUpdates = updatesList.length;
    
    // Calculate average progress across all projects
    const projectProgress = {};
    updatesList.forEach(update => {
      if (!projectProgress[update.project_id] || 
          new Date(update.progress_date) > new Date(projectProgress[update.project_id].date)) {
        projectProgress[update.project_id] = {
          percentage: update.percentage,
          date: update.progress_date
        };
      }
    });
    
    const totalProgress = Object.values(projectProgress).reduce((sum, p) => sum + (p.percentage || 0), 0);
    const averageProgress = Object.keys(projectProgress).length > 0 
      ? totalProgress / Object.keys(projectProgress).length 
      : 0;
    
    const projectsWithUpdates = Object.keys(projectProgress).length;
    const latestUpdate = updatesList[0] || null;

    setStats({
      totalUpdates,
      averageProgress,
      projectsWithUpdates,
      latestUpdate
    });
  };

  const filterUpdates = () => {
    let filtered = [...updates];
    
    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(update => update.project_id === selectedProject);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(update => 
        update.phase?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.reported_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(update => 
        new Date(update.progress_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(update => 
        new Date(update.progress_date) <= new Date(dateRange.end)
      );
    }
    
    setFilteredUpdates(filtered);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUpdates();
  }, [updates, selectedProject, searchTerm, dateRange]);

  const handleDeleteUpdate = async (update) => {
    const result = await Swal.fire({
      title: 'Delete Progress Update?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Delete progress update for:<br>
            <strong>"${update.project_name}"</strong>
          </p>
          <p style="color: #64748b; margin-bottom: 10px;">
            Phase: ${update.phase}<br>
            Progress: ${update.percentage}%
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
      setDeleting(true);
      try {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');
        
        const response = await fetch(`${API_URL}/progress/${update.progress_id}`, {
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
            text: 'Progress update has been deleted successfully.',
            timer: 1500
          });
          
          // Refresh the updates list
          fetchData();
        } else {
          throw new Error(data.message || 'Delete failed');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete progress update'
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleViewDetails = (update) => {
    Swal.fire({
      title: 'Progress Update Details',
      html: `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <div style="border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b;">${update.project_name}</h3>
            <p style="color: #64748b;">${new Date(update.progress_date).toLocaleString()}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">Phase:</span>
              <span>${update.phase?.replace('_', ' ')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">Progress:</span>
              <span style="color: #667eea; font-weight: bold;">${update.percentage}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">Reported by:</span>
              <span>${update.reported_by}</span>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <div class="progress-bar" style="height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden;">
              <div class="progress-fill" style="width: ${update.percentage}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 8px;">Description:</p>
            <p style="color: #4b5563;">${update.description || 'No description provided.'}</p>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: userRole === 'client', // Show delete button only for clients
      confirmButtonText: 'Close',
      cancelButtonText: 'Delete',
      confirmButtonColor: '#667eea',  // Close button is blue
      cancelButtonColor: '#ef4444',   // Delete button is red
      reverseButtons: false            // Keep Close on left, Delete on right
    }).then((result) => {
      // When user clicks "Close" button (confirm)
      if (result.isConfirmed) {
        // Just close the modal - no action needed
        console.log('Modal closed');
      }
      // When user clicks "Delete" button (cancel)
      else if (result.dismiss === Swal.DismissReason.cancel && userRole === 'client') {
        // Show delete confirmation before actually deleting
        handleDeleteUpdate(update);
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleProjectClick = (projectId) => {
    navigate(`/view-project/${projectId}`);
  };

  const getProgressColor = (percentage) => {
    if (percentage < 25) return '#ef4444';
    if (percentage < 50) return '#f59e0b';
    if (percentage < 75) return '#3b82f6';
    return '#10b981';
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

  return (
    <div className="progress-updates-container">
      <div className="progress-updates-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <h1>Progress Updates</h1>
              <p className="header-subtitle">Track construction progress across your projects</p>
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
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalUpdates}</div>
              <div className="stat-label">Total Updates</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon average">
              <i className="fas fa-percent"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.averageProgress.toFixed(1)}%</div>
              <div className="stat-label">Average Progress</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon projects">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.projectsWithUpdates}</div>
              <div className="stat-label">Projects with Updates</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon latest">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {stats.latestUpdate ? new Date(stats.latestUpdate.progress_date).toLocaleDateString() : 'N/A'}
              </div>
              <div className="stat-label">Latest Update</div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bars */}
        <div className="overall-progress">
          <h4><i className="fas fa-chart-line"></i> Project Progress Overview</h4>
          <div className="project-progress-bars">
            {projects.map(project => {
              const progress = project.progress || 0;
              const projectUpdates = updates.filter(u => u.project_id === project.project_id);
              const latestUpdate = projectUpdates[0];
              
              return (
                <div key={project.project_id} className="project-progress-item" onClick={() => handleProjectClick(project.project_id)}>
                  <div className="progress-header">
                    <span className="project-name">{project.project_name}</span>
                    <span className="progress-percentage" style={{ color: getProgressColor(progress) }}>{progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress}%`, backgroundColor: getProgressColor(progress) }}></div>
                  </div>
                  <div className="progress-footer">
                    <span className="update-count">{projectUpdates.length} updates</span>
                    {latestUpdate && (
                      <span className="last-update">Last: {new Date(latestUpdate.progress_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
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

          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search updates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="date-range">
            <input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="date-input"
            />
          </div>

          {(selectedProject !== 'all' || searchTerm || dateRange.start || dateRange.end) && (
            <button 
              className="btn btn-secondary clear-btn"
              onClick={() => {
                setSelectedProject('all');
                setSearchTerm('');
                setDateRange({ start: '', end: '' });
              }}
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Timeline Section */}
        <div className="timeline-section">
          <h4><i className="fas fa-history"></i> Progress Timeline</h4>
          
          {loading ? (
            <div className="loading-spinner">Loading progress updates...</div>
          ) : (
            <div className="timeline">
              {filteredUpdates.length > 0 ? (
                filteredUpdates.map((update, index) => (
                  <div key={update.progress_id} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="marker-dot" style={{ background: getProgressColor(update.percentage) }}></div>
                      {index < filteredUpdates.length - 1 && <div className="marker-line"></div>}
                    </div>
                    
                    <div className="timeline-content" onClick={() => handleViewDetails(update)}>
                      <div className="timeline-header">
                        <div>
                          <h4 className="project-name">{update.project_name}</h4>
                          <span className="phase-badge">{update.phase?.replace('_', ' ')}</span>
                        </div>
                        <span className="update-date">{new Date(update.progress_date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="progress-indicator">
                        <div className="progress-bar-small">
                          <div className="progress-fill-small" style={{ width: `${update.percentage}%`, background: getProgressColor(update.percentage) }}></div>
                        </div>
                        <span className="progress-value">{update.percentage}%</span>
                      </div>
                      
                      <p className="update-description">{update.description}</p>
                      
                      <div className="update-footer">
                        <span className="reported-by">
                          <i className="fas fa-user"></i> {update.reported_by || 'Unknown'}
                        </span>
                        <div className="update-actions">
                          <button className="view-details-btn" onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(update);
                          }}>
                            View Details <i className="fas fa-arrow-right"></i>
                          </button>
                          {userRole === 'client' && (
                            <button className="delete-update-btn" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUpdate(update);
                            }} disabled={deleting}>
                              <i className="fas fa-trash-alt"></i> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h3>No Progress Updates Found</h3>
                  <p>
                    {searchTerm || selectedProject !== 'all' || dateRange.start || dateRange.end
                      ? 'No updates match your search criteria.'
                      : 'Your foreman will post progress updates here.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Highlights Section */}
        <div className="summary-section">
          <h4><i className="fas fa-star"></i> Recent Highlights</h4>
          <div className="highlights-grid">
            {filteredUpdates.slice(0, 3).map(update => (
              <div key={update.progress_id} className="highlight-card" onClick={() => handleViewDetails(update)}>
                <div className="highlight-header">
                  <span className="project-badge">{update.project_name}</span>
                  <span className="highlight-date">{new Date(update.progress_date).toLocaleDateString()}</span>
                </div>
                <div className="highlight-phase">
                  <strong>{update.phase?.replace('_', ' ')}</strong>
                </div>
                <div className="highlight-progress">
                  <div className="progress-circle" style={{ 
                    background: `conic-gradient(${getProgressColor(update.percentage)} 0% ${update.percentage}%, #e5e7eb ${update.percentage}% 100%)` 
                  }}>
                    <div className="progress-circle-text">{update.percentage}%</div>
                  </div>
                </div>
                <p className="highlight-description">{update.description?.substring(0, 100)}...</p>
                <div className="highlight-footer">
                  <span><i className="fas fa-user"></i> {update.reported_by}</span>
                  <span className="view-link">View Details <i className="fas fa-chevron-right"></i></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressUpdates;
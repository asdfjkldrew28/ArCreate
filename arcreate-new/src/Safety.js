import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Safety.css';

const API_URL = 'http://localhost:5000/api';

const Safety = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [stats, setStats] = useState({
    totalChecklists: 0,
    completedChecklists: 0,
    openIncidents: 0,
    daysWithoutIncident: 0
  });
  const [activeTab, setActiveTab] = useState('checklists');
  const [workers, setWorkers] = useState([]);

  const handleBack = () => {
    navigate(-1);
  };

  // Form state for new checklist
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [checklistForm, setChecklistForm] = useState({
    project_id: '',
    checklist_date: new Date().toISOString().split('T')[0],
    inspector: fullName || username,
    items: {
      ppe: false,
      signage: false,
      fire_extinguisher: false,
      first_aid: false,
      electrical_safety: false,
      scaffolding: false,
      excavation: false,
      confined_space: false,
      hot_work: false,
      chemical_storage: false
    },
    comments: '',
    overall_status: 'safe'
  });

  // Form state for new incident
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    project_id: '',
    incident_date: new Date().toISOString().split('T')[0],
    incident_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    incident_type: 'near_miss',
    severity: 'minor',
    location: '',
    description: '',
    involved_persons: '',
    involved_workers: [],
    actions_taken: '',
    reported_by: fullName || username,
    status: 'open'
  });

  const incidentTypes = [
    { value: 'near_miss', label: '🟡 Near Miss', color: '#f59e0b' },
    { value: 'minor', label: '🟠 Minor Injury', color: '#f97316' },
    { value: 'major', label: '🔴 Major Injury', color: '#ef4444' },
    { value: 'fatality', label: '⚫ Fatality', color: '#6b7280' },
    { value: 'property_damage', label: '🔵 Property Damage', color: '#3b82f6' },
    { value: 'environmental', label: '🟢 Environmental', color: '#10b981' }
  ];

  const severityOptions = [
    { value: 'minor', label: '🟡 Minor', color: '#f59e0b' },
    { value: 'moderate', label: '🟠 Moderate', color: '#f97316' },
    { value: 'severe', label: '🔴 Severe', color: '#ef4444' },
    { value: 'critical', label: '⚫ Critical', color: '#6b7280' }
  ];

  const checklistItems = [
    { id: 'ppe', label: '👷 Personal Protective Equipment (PPE)', icon: 'fa-hard-hat' },
    { id: 'signage', label: '⚠️ Safety Signage', icon: 'fa-exclamation-triangle' },
    { id: 'fire_extinguisher', label: '🧯 Fire Extinguisher', icon: 'fa-fire-extinguisher' },
    { id: 'first_aid', label: '🏥 First Aid Kit', icon: 'fa-medkit' },
    { id: 'electrical_safety', label: '⚡ Electrical Safety', icon: 'fa-bolt' },
    { id: 'scaffolding', label: '🪜 Scaffolding Safety', icon: 'fa-paint-roller' },
    { id: 'excavation', label: '⛏️ Excavation Safety', icon: 'fa-trowel' },
    { id: 'confined_space', label: '🚪 Confined Space', icon: 'fa-door-closed' },
    { id: 'hot_work', label: '🔥 Hot Work Permits', icon: 'fa-fire' },
    { id: 'chemical_storage', label: '🧪 Chemical Storage', icon: 'fa-flask' }
  ];

  const fetchData = useCallback(async () => {
    setPageLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch projects assigned to this foreman
      const projectsResponse = await fetch(`${API_URL}/projects/foreman/${userId}`);
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);
      
      // Fetch safety checklists
      const checklistsResponse = await fetch(`${API_URL}/safety/checklists?foreman_id=${userId}`);
      const checklistsData = await checklistsResponse.json();
      setChecklists(checklistsData.checklists || []);
      
      // Fetch incidents
      const incidentsResponse = await fetch(`${API_URL}/safety/incidents?foreman_id=${userId}`);
      const incidentsData = await incidentsResponse.json();
      setIncidents(incidentsData.incidents || []);
      
      calculateStats(checklistsData.checklists || [], incidentsData.incidents || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load data'
      });
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${API_URL}/workers`);
      const data = await response.json();
      setWorkers(data.workers?.filter(w => w.status === 'active') || []);
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const calculateStats = (checklistsList, incidentsList) => {
    const totalChecklists = checklistsList.length;
    const completedChecklists = checklistsList.filter(c => c.overall_status === 'safe' || c.overall_status === 'corrected').length;
    const openIncidents = incidentsList.filter(i => i.status === 'open' || i.status === 'investigating').length;
    
    // Calculate days without incident
    const incidentsWithDates = incidentsList
      .filter(i => i.incident_date)
      .map(i => new Date(i.incident_date));
    
    let daysWithoutIncident = 0;
    if (incidentsWithDates.length > 0) {
      const lastIncident = new Date(Math.max(...incidentsWithDates));
      const today = new Date();
      const diffTime = Math.abs(today - lastIncident);
      daysWithoutIncident = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // If no incidents, count from project start or set to 30
      daysWithoutIncident = 30;
    }

    setStats({
      totalChecklists,
      completedChecklists,
      openIncidents,
      daysWithoutIncident
    });
  };

  const handleChecklistChange = (itemId, value) => {
    setChecklistForm(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: value
      }
    }));
  };

  const handleSubmitChecklist = async (e) => {
    e.preventDefault();
    
    if (!checklistForm.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Submitting Checklist...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const selectedProject = projects.find(p => p.project_id === checklistForm.project_id);

      const response = await fetch(`${API_URL}/safety/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...checklistForm,
          project_name: selectedProject?.project_name,
          foreman_id: localStorage.getItem('userId'),
          created_at: new Date()
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Safety checklist submitted successfully',
          timer: 1500
        });

        setChecklistForm({
          project_id: '',
          checklist_date: new Date().toISOString().split('T')[0],
          inspector: fullName || username,
          items: {
            ppe: false,
            signage: false,
            fire_extinguisher: false,
            first_aid: false,
            electrical_safety: false,
            scaffolding: false,
            excavation: false,
            confined_space: false,
            hot_work: false,
            chemical_storage: false
          },
          comments: '',
          overall_status: 'safe'
        });
        setShowChecklistForm(false);
        fetchData();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit checklist'
      });
    }
  };

  const handleSubmitIncident = async (e) => {
    e.preventDefault();
    
    if (!incidentForm.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    if (!incidentForm.description) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Description',
        text: 'Please describe the incident'
      });
      return;
    }

    if (!incidentForm.involved_persons || !incidentForm.involved_persons.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Involved Persons',
        text: 'Please specify involved persons'
      });
      return;
    }

    if (!incidentForm.actions_taken || !incidentForm.actions_taken.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Actions Taken',
        text: 'Please specify actions taken'
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Submitting Incident Report...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const selectedProject = projects.find(p => p.project_id === incidentForm.project_id);

      const response = await fetch(`${API_URL}/safety/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...incidentForm,
          project_name: selectedProject?.project_name,
          foreman_id: localStorage.getItem('userId'),
          created_at: new Date()
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Incident report submitted successfully',
          timer: 1500
        });

        setIncidentForm({
          project_id: '',
          incident_date: new Date().toISOString().split('T')[0],
          incident_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          incident_type: 'near_miss',
          severity: 'minor',
          location: '',
          description: '',
          involved_persons: '',
          actions_taken: '',
          reported_by: fullName || username,
          status: 'open'
        });
        setShowIncidentForm(false);
        fetchData();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit incident report'
      });
    }
  };

  const handleViewIncident = (incident) => {
    Swal.fire({
      title: 'Incident Report',
      html: `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <div style="border-bottom: 2px solid ${incidentTypes.find(t => t.value === incident.incident_type)?.color || '#f59e0b'}; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b;">${incident.project_name}</h3>
            <p style="color: #64748b;">${new Date(incident.incident_date).toLocaleDateString()} at ${incident.incident_time}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📋 Incident Details</h4>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
              <p><strong>Type:</strong> ${incidentTypes.find(t => t.value === incident.incident_type)?.label || incident.incident_type}</p>
              <p><strong>Severity:</strong> ${severityOptions.find(s => s.value === incident.severity)?.label || incident.severity}</p>
              <p><strong>Location:</strong> ${incident.location || 'Not specified'}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📝 Description</h4>
            <p>${incident.description}</p>
          </div>
          
          ${incident.involved_persons ? `
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1e293b; margin-bottom: 10px;">👥 Involved Persons</h4>
              <p>${incident.involved_persons}</p>
            </div>
          ` : ''}
          
          ${incident.actions_taken ? `
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1e293b; margin-bottom: 10px;">🛠️ Actions Taken</h4>
              <p>${incident.actions_taken}</p>
            </div>
          ` : ''}
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📊 Status</h4>
            <span class="incident-status status-${incident.status}">
              ${incident.status}
            </span>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #64748b; font-size: 0.85rem;">
            <p><i class="fas fa-user"></i> Reported by: ${incident.reported_by}</p>
          </div>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#f59e0b'
    });
  };

  const handleUpdateIncidentStatus = async (incidentId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/safety/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: `Incident status updated to ${newStatus}`,
          timer: 1500
        });
        fetchData();
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update incident'
      });
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
    <div className="safety-container">
      <div className="safety-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div>
              <h1>Safety Management</h1>
              <p className="header-subtitle">Monitor and maintain workplace safety</p>
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
              <i className="fas fa-clipboard-check"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalChecklists}</div>
              <div className="stat-label">Total Checklists</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.completedChecklists}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon incidents">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.openIncidents}</div>
              <div className="stat-label">Open Incidents</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon days">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.daysWithoutIncident}</div>
              <div className="stat-label">Days Safe</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'checklists' ? 'active' : ''}`}
            onClick={() => setActiveTab('checklists')}
          >
            <i className="fas fa-clipboard-check"></i> Safety Checklists
          </button>
          <button 
            className={`tab ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <i className="fas fa-exclamation-triangle"></i> Incident Reports
          </button>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          {activeTab === 'checklists' ? (
            <button className="btn btn-primary" onClick={() => setShowChecklistForm(!showChecklistForm)}>
              <i className={`fas fa-${showChecklistForm ? 'times' : 'plus'}`}></i>
              {showChecklistForm ? 'Cancel' : 'New Safety Checklist'}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowIncidentForm(!showIncidentForm)}>
              <i className={`fas fa-${showIncidentForm ? 'times' : 'plus'}`}></i>
              {showIncidentForm ? 'Cancel' : 'Report Incident'}
            </button>
          )}

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
        </div>

        {/* Checklists Tab */}
        {activeTab === 'checklists' && (
          <>
            {/* New Checklist Form */}
            {showChecklistForm && (
              <div className="checklist-form-section">
                <h3><i className="fas fa-clipboard-check"></i> Daily Safety Checklist</h3>
                <form onSubmit={handleSubmitChecklist} className="checklist-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="required">Project</label>
                      <select name="project_id" value={checklistForm.project_id} onChange={(e) => setChecklistForm(prev => ({ ...prev, project_id: e.target.value }))} required>
                        <option value="">Select Project</option>
                        {projects.map(project => (
                          <option key={project.project_id} value={project.project_id}>
                            {project.project_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="required">Date</label>
                      <input
                        type="date"
                        name="checklist_date"
                        value={checklistForm.checklist_date}
                        onChange={(e) => setChecklistForm(prev => ({ ...prev, checklist_date: e.target.value }))}
                        required
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="checklist-items">
                    <h4>Safety Checklist Items</h4>
                    {checklistItems.map(item => (
                      <div key={item.id} className="checklist-item">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={checklistForm.items[item.id]}
                            onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                          />
                          <span className="checkbox-custom"></span>
                          <i className={`fas ${item.icon}`}></i>
                          <span>{item.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label>Comments / Observations</label>
                    <textarea
                      name="comments"
                      value={checklistForm.comments}
                      onChange={(e) => setChecklistForm(prev => ({ ...prev, comments: e.target.value }))}
                      rows="3"
                      placeholder="Any observations or notes about safety conditions..."
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label className="required">Overall Safety Status</label>
                    <select name="overall_status" value={checklistForm.overall_status} onChange={(e) => setChecklistForm(prev => ({ ...prev, overall_status: e.target.value }))} required>
                      <option value="safe">✅ Safe - All Good</option>
                      <option value="minor_issues">⚠️ Minor Issues Found</option>
                      <option value="unsafe">🔴 Unsafe - Immediate Action Needed</option>
                      <option value="corrected">🟢 Corrected During Inspection</option>
                    </select>
                  </div>

                  <div className="btn-group">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save"></i> Submit Checklist
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowChecklistForm(false)}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Checklists List */}
            <div className="checklists-section">
              <h3><i className="fas fa-history"></i> Recent Checklists</h3>
              <div className="checklists-list">
                {checklists.length > 0 ? (
                  checklists
                    .filter(c => selectedProject === 'all' || c.project_id === selectedProject)
                    .map(checklist => {
                      const completedItems = Object.values(checklist.items).filter(v => v).length;
                      const totalItems = Object.keys(checklist.items).length;
                      const percentage = (completedItems / totalItems) * 100;

                      return (
                        <div key={checklist._id} className="checklist-card">
                          <div className="checklist-header">
                            <div>
                              <h4 className="project-name">{checklist.project_name}</h4>
                              <p className="checklist-date">
                                <i className="fas fa-calendar"></i> {new Date(checklist.checklist_date).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`status-badge status-${checklist.overall_status}`}>
                              {checklist.overall_status?.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="checklist-progress">
                            <div className="progress-info">
                              <span>Safety Compliance</span>
                              <span>{completedItems}/{totalItems}</span>
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>

                          <div className="checklist-items-preview">
                            {checklistItems.slice(0, 3).map(item => (
                              <div key={item.id} className="preview-item">
                                <i className={`fas ${item.icon}`} style={{ color: checklist.items[item.id] ? '#10b981' : '#ef4444' }}></i>
                                <span className={checklist.items[item.id] ? 'compliant' : 'non-compliant'}>
                                  {item.label.split(' ')[1]}
                                </span>
                              </div>
                            ))}
                            {totalItems > 3 && (
                              <span className="more-items">+{totalItems - 3} more</span>
                            )}
                          </div>

                          {checklist.comments && (
                            <div className="checklist-comments">
                              <i className="fas fa-comment"></i> {checklist.comments}
                            </div>
                          )}

                          <div className="checklist-footer">
                            <span className="inspector">
                              <i className="fas fa-user"></i> {checklist.inspector}
                            </span>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <i className="fas fa-clipboard-check"></i>
                    </div>
                    <h3>No Checklists Found</h3>
                    <p>Create your first safety checklist to start tracking.</p>
                    <button className="btn btn-primary" onClick={() => setShowChecklistForm(true)}>
                      <i className="fas fa-plus"></i> Create Checklist
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <>
            {/* New Incident Form */}
            {showIncidentForm && (
              <div className="incident-form-section">
                <h3><i className="fas fa-exclamation-triangle"></i> Report Incident</h3>
                <form onSubmit={handleSubmitIncident} className="incident-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="required">Project</label>
                      <select name="project_id" value={incidentForm.project_id} onChange={(e) => setIncidentForm(prev => ({ ...prev, project_id: e.target.value }))} required>
                        <option value="">Select Project</option>
                        {projects.map(project => (
                          <option key={project.project_id} value={project.project_id}>
                            {project.project_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="required">Date</label>
                      <input
                        type="date"
                        name="incident_date"
                        value={incidentForm.incident_date}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_date: e.target.value }))}
                        required
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="required">Time</label>
                      <input
                        type="time"
                        name="incident_time"
                        value={incidentForm.incident_time}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_time: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="required">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={incidentForm.location}
                        onChange={(e) => setIncidentForm(prev => ({ ...prev, location: e.target.value }))}
                        required
                        placeholder="e.g., Building A, Floor 2"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="required">Incident Type</label>
                      <select name="incident_type" value={incidentForm.incident_type} onChange={(e) => setIncidentForm(prev => ({ ...prev, incident_type: e.target.value }))} required>
                        {incidentTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="required">Severity</label>
                      <select name="severity" value={incidentForm.severity} onChange={(e) => setIncidentForm(prev => ({ ...prev, severity: e.target.value }))} required>
                        {severityOptions.map(severity => (
                          <option key={severity.value} value={severity.value}>{severity.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="required">Description of Incident</label>
                    <textarea
                      name="description"
                      value={incidentForm.description}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                      required
                      rows="4"
                      placeholder="Describe what happened in detail..."
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label className="required">Involved Persons</label>
                    <div className="worker-select-container">
                      <select 
                        multiple
                        size="4"
                        value={incidentForm.involved_workers}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          const selectedNames = selected.map(id => {
                            const worker = workers.find(w => w._id === id);
                            return worker ? worker.full_name : '';
                          }).filter(Boolean).join(', ');

                          setIncidentForm(prev => ({
                            ...prev,
                            involved_workers: selected,
                            involved_persons: selectedNames
                          }));
                        }}
                        className="worker-select"
                      >
                        {workers.map(worker => (
                          <option key={worker._id} value={worker._id}>
                            {worker.full_name} - {worker.position}
                          </option>
                        ))}
                      </select>
                      <small className="help-text">
                        Hold Ctrl (or Cmd on Mac) to select multiple workers
                      </small>
                    </div>
                    <input
                      type="text"
                      name="involved_persons"
                      value={incidentForm.involved_persons}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, involved_persons: e.target.value }))}
                      required
                      placeholder="Or type names manually"
                      className="mt-2"
                    />
                  </div>

                  <div className="form-group">
                    <label className="required">Actions Taken</label>
                    <textarea
                      name="actions_taken"
                      value={incidentForm.actions_taken}
                      onChange={(e) => setIncidentForm(prev => ({ ...prev, actions_taken: e.target.value }))}
                      required
                      rows="3"
                      placeholder="What immediate actions were taken? (required)"
                    ></textarea>
                  </div>

                  <div className="btn-group">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save"></i> Submit Report
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowIncidentForm(false)}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Incidents List */}
            <div className="incidents-section">
              <h3><i className="fas fa-list"></i> Incident Reports</h3>
              <div className="incidents-list">
                {incidents.length > 0 ? (
                  incidents
                    .filter(i => selectedProject === 'all' || i.project_id === selectedProject)
                    .map(incident => (
                      <div key={incident._id} className="incident-card" style={{ borderLeftColor: incidentTypes.find(t => t.value === incident.incident_type)?.color || '#f59e0b' }}>
                        <div className="incident-header">
                          <div>
                            <h4 className="project-name">{incident.project_name}</h4>
                            <p className="incident-datetime">
                              <i className="fas fa-calendar"></i> {new Date(incident.incident_date).toLocaleDateString()} at {incident.incident_time}
                            </p>
                          </div>
                          <span className={`incident-status status-${incident.status}`}>
                            {incident.status}
                          </span>
                        </div>

                        <div className="incident-body">
                          <div className="incident-type-badge" style={{ background: `${incidentTypes.find(t => t.value === incident.incident_type)?.color}20`, color: incidentTypes.find(t => t.value === incident.incident_type)?.color }}>
                            {incidentTypes.find(t => t.value === incident.incident_type)?.label || incident.incident_type}
                          </div>
                          <p className="incident-location">
                            <i className="fas fa-map-marker-alt"></i> {incident.location}
                          </p>
                          <p className="incident-description">
                            {incident.description.substring(0, 100)}...
                          </p>
                        </div>

                        <div className="incident-footer">
                          <span className="reported-by">
                            <i className="fas fa-user"></i> {incident.reported_by}
                          </span>
                          <div className="incident-actions">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => handleViewIncident(incident)}
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            {incident.status !== 'closed' && (
                              <select 
                                className="status-update"
                                value={incident.status}
                                onChange={(e) => handleUpdateIncidentStatus(incident._id, e.target.value)}
                              >
                                <option value="open">Open</option>
                                <option value="investigating">Investigating</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                              </select>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <h3>No Incidents Reported</h3>
                    <p>Great job! Keep up the safe work environment.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Safety;
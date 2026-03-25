// In DailyReports.js, update the header and form validation

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import './DailyReports.css';

const API_URL = 'http://localhost:5000/api';

const DailyReports = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromUrl = queryParams.get('project_id');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromUrl || 'all');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    totalReports: 0,
    activeProjects: 0,
    recentReports: 0,
    averageProgress: 0
  });

  // Form state for new report
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: projectIdFromUrl || '',
    report_date: new Date().toISOString().split('T')[0],
    weather_conditions: 'sunny',
    temperature: '',
    work_description: '',
    work_completed: '',
    work_planned: '',
    issues_encountered: '',
    material_used: '',
    equipment_used: '',
    workers_present: '',
    hours_worked: '',
    safety_incidents: 'none',
    supervisor_notes: '',
    images: []
  });

  const weatherOptions = [
    { value: 'sunny', label: '☀️ Sunny', icon: 'fa-sun' },
    { value: 'cloudy', label: '☁️ Cloudy', icon: 'fa-cloud' },
    { value: 'rainy', label: '🌧️ Rainy', icon: 'fa-cloud-rain' },
    { value: 'stormy', label: '⛈️ Stormy', icon: 'fa-cloud-showers-heavy' },
    { value: 'windy', label: '💨 Windy', icon: 'fa-wind' }
  ];

  const safetyOptions = [
    { value: 'none', label: '✅ No Incidents' },
    { value: 'minor', label: '⚠️ Minor Incident' },
    { value: 'major', label: '🔴 Major Incident' },
    { value: 'near_miss', label: '🟡 Near Miss' }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch projects assigned to this foreman
      const projectsResponse = await fetch(`${API_URL}/projects/foreman/${userId}`);
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);
      
      // If projectId from URL exists, select it, otherwise default to 'all'
      if (projectIdFromUrl) {
        setSelectedProject(projectIdFromUrl);
      } else {
        setSelectedProject('all');
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load data'
      });
    } finally {
      setLoading(false);
    }
  }, [projectIdFromUrl]);

  const fetchReports = useCallback(async () => {
    try {
      let url = `${API_URL}/reports/project/${selectedProject}?start=${dateRange.start}&end=${dateRange.end}`;

      // If 'all' is selected, fetch all reports
      if (selectedProject === 'all') {
        url = `${API_URL}/reports/all?start=${dateRange.start}&end=${dateRange.end}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setReports(data.reports || []);
      calculateStats(data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  }, [selectedProject, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const calculateStats = (reportsList) => {
    const totalReports = reportsList.length;

    // Calculate unique projects with reports and average progress
    const uniqueProjectIds = new Set();
    let totalProgress = 0;
    let progressCount = 0;

    reportsList.forEach((report) => {
      if (report.project_id) {
        uniqueProjectIds.add(report.project_id.toString());
      }
      if (typeof report.work_progress === 'number') {
        totalProgress += report.work_progress;
        progressCount += 1;
      }
    });

    const averageProgress = progressCount > 0 ? totalProgress / progressCount : 0;

    setStats({
      totalReports,
      activeProjects: uniqueProjectIds.size,
      recentReports: reportsList.filter(r =>
        new Date(r.report_date) >= new Date(new Date().setDate(new Date().getDate() - 7))
      ).length,
      averageProgress
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, images: files }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    if (!formData.work_completed) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Work completed today is required'
      });
      return;
    }

    // NEW REQUIRED FIELDS
    if (!formData.work_description) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Detailed work description is required'
      });
      return;
    }

    if (!formData.work_planned) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Work planned for tomorrow is required'
      });
      return;
    }

    if (!formData.issues_encountered) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Issues encountered is required'
      });
      return;
    }

    if (!formData.material_used) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Materials used is required'
      });
      return;
    }

    if (!formData.equipment_used) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Equipment used is required'
      });
      return;
    }

    if (!formData.workers_present) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Workers present is required'
      });
      return;
    }

    if (!formData.hours_worked) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Hours worked is required'
      });
      return;
    }

    try {
      // Show loading
      Swal.fire({
        title: 'Submitting Report...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          foreman_id: localStorage.getItem('userId'),
          foreman_name: fullName || username,
          created_at: new Date()
        })
      });

      const data = await response.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Daily report submitted successfully',
          timer: 1500
        });

        // Reset form
        setFormData({
          project_id: selectedProject,
          report_date: new Date().toISOString().split('T')[0],
          weather_conditions: 'sunny',
          temperature: '',
          work_description: '',
          work_completed: '',
          work_planned: '',
          issues_encountered: '',
          material_used: '',
          equipment_used: '',
          workers_present: '',
          hours_worked: '',
          safety_incidents: 'none',
          supervisor_notes: '',
          images: []
        });
        setShowForm(false);
        
        // Refresh reports
        fetchReports();
      } else {
        throw new Error(data.message || 'Failed to submit report');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit report'
      });
    }
  };

  const handleViewReport = (report) => {
    Swal.fire({
      title: `Daily Report - ${new Date(report.report_date).toLocaleDateString()}`,
      html: `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b;">${report.project_name}</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span class="weather-badge weather-${report.weather_conditions}">
                ${weatherOptions.find(w => w.value === report.weather_conditions)?.label || '☀️ Sunny'}
              </span>
              ${report.temperature ? `<span class="temp-badge">🌡️ ${report.temperature}°C</span>` : ''}
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📋 Work Completed</h4>
            <p style="background: #f8fafc; padding: 15px; border-radius: 8px;">${report.work_completed}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📝 Detailed Work Description</h4>
            <p>${report.work_description || 'Not provided'}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">📅 Work Planned for Tomorrow</h4>
            <p>${report.work_planned || 'Not provided'}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #ef4444; margin-bottom: 10px;">⚠️ Issues Encountered</h4>
            <p>${report.issues_encountered || 'None reported'}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <h4 style="color: #1e293b; margin-bottom: 5px;">🧱 Materials Used</h4>
              <p>${report.material_used || 'Not specified'}</p>
            </div>
            
            <div>
              <h4 style="color: #1e293b; margin-bottom: 5px;">🔧 Equipment Used</h4>
              <p>${report.equipment_used || 'Not specified'}</p>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
              <h4 style="color: #1e293b; margin-bottom: 5px;">👥 Workers Present</h4>
              <p>${report.workers_present || 'Not specified'}</p>
            </div>
            
            <div>
              <h4 style="color: #1e293b; margin-bottom: 5px;">⏱️ Hours Worked</h4>
              <p>${report.hours_worked || 'Not specified'}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">🦺 Safety Status</h4>
            <span class="safety-badge safety-${report.safety_incidents}">
              ${safetyOptions.find(s => s.value === report.safety_incidents)?.label || '✅ No Incidents'}
            </span>
          </div>
          
          ${report.supervisor_notes ? `
            <div style="margin-bottom: 20px;">
              <h4 style="color: #1e293b; margin-bottom: 10px;">📌 Supervisor Notes</h4>
              <p>${report.supervisor_notes}</p>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #64748b; font-size: 0.85rem;">
            <i class="fas fa-user"></i> Reported by: ${report.foreman_name || 'Unknown'}
          </div>
        </div>
      `,
      width: '700px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#f59e0b'
    });
  };

  const handleDownloadReport = (report) => {
    // Create report content with all fields
    const content = `
      ARCREATE CONSTRUCTION - DAILY REPORT
      =====================================
      
      Date: ${new Date(report.report_date).toLocaleDateString()}
      Project: ${report.project_name}
      Foreman: ${report.foreman_name || 'Unknown'}
      
      WEATHER CONDITIONS
      -----------------
      Weather: ${report.weather_conditions}
      ${report.temperature ? `Temperature: ${report.temperature}°C` : ''}
      
      WORK COMPLETED
      --------------
      ${report.work_completed}
      
      DETAILED WORK DESCRIPTION
      -------------------------
      ${report.work_description || 'Not provided'}
      
      WORK PLANNED FOR TOMORROW
      -------------------------
      ${report.work_planned || 'Not provided'}
      
      ISSUES ENCOUNTERED
      ------------------
      ${report.issues_encountered || 'None reported'}
      
      MATERIALS USED
      --------------
      ${report.material_used || 'Not specified'}
      
      EQUIPMENT USED
      --------------
      ${report.equipment_used || 'Not specified'}
      
      WORKFORCE
      ---------
      Workers Present: ${report.workers_present || 'Not specified'}
      Hours Worked: ${report.hours_worked || 'Not specified'}
      
      SAFETY
      ------
      Safety Incidents: ${report.safety_incidents}
      
      ${report.supervisor_notes ? `SUPERVISOR NOTES\n----------------\n${report.supervisor_notes}\n` : ''}
      
      Report generated by ArCreate Construction Management System
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${report.project_name}-${new Date(report.report_date).toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Download Started',
      text: 'Report has been downloaded.',
      timer: 1500
    });
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
    <div className="daily-reports-container">
      <div className="daily-reports-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <div>
              <h1>Daily Reports</h1>
              <p className="header-subtitle">Document daily construction activities and progress</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon reports">
              <i className="fas fa-file-alt"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalReports}</div>
              <div className="stat-label">Total Reports</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon projects">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeProjects}</div>
              <div className="stat-label">Projects with Reports</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon recent">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.recentReports}</div>
              <div className="stat-label">Last 7 Days</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon progress">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.averageProgress.toFixed(1)}%</div>
              <div className="stat-label">Avg Progress</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
            {showForm ? 'Cancel' : 'New Daily Report'}
          </button>

          <div className="filters">
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

            <div className="date-range">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="date-input"
              />
            </div>
          </div>
        </div>

        {/* New Report Form */}
        {showForm && (
          <div className="report-form-section">
            <h3><i className="fas fa-edit"></i> New Daily Report</h3>
            <form onSubmit={handleSubmit} className="report-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Project</label>
                  <select name="project_id" value={formData.project_id} onChange={handleInputChange} required>
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="required">Report Date</label>
                  <input
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Weather Conditions</label>
                  <select name="weather_conditions" value={formData.weather_conditions} onChange={handleInputChange} required>
                    {weatherOptions.map(weather => (
                      <option key={weather.value} value={weather.value}>{weather.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Temperature (°C)</label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    placeholder="e.g., 32"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="required">Work Completed Today</label>
                <textarea
                  name="work_completed"
                  value={formData.work_completed}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe all work completed today..."
                ></textarea>
              </div>

              <div className="form-group">
                <label className="required">Detailed Work Description</label>
                <textarea
                  name="work_description"
                  value={formData.work_description}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Detailed description of the work performed..."
                ></textarea>
              </div>

              <div className="form-group">
                <label className="required">Work Planned for Tomorrow</label>
                <textarea
                  name="work_planned"
                  value={formData.work_planned}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="What work is planned for tomorrow?"
                ></textarea>
              </div>

              <div className="form-group">
                <label className="required">Issues Encountered</label>
                <textarea
                  name="issues_encountered"
                  value={formData.issues_encountered}
                  onChange={handleInputChange}
                  required
                  rows="3"
                  placeholder="Any problems, delays, or challenges?"
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Materials Used</label>
                  <input
                    type="text"
                    name="material_used"
                    value={formData.material_used}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 50 bags cement, 100 pcs hollow blocks"
                  />
                </div>
                <div className="form-group">
                  <label className="required">Equipment Used</label>
                  <input
                    type="text"
                    name="equipment_used"
                    value={formData.equipment_used}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Excavator, Mixer, Vibrator"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Workers Present</label>
                  <input
                    type="text"
                    name="workers_present"
                    value={formData.workers_present}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 8 workers, 2 carpenters"
                  />
                </div>
                <div className="form-group">
                  <label className="required">Hours Worked</label>
                  <input
                    type="text"
                    name="hours_worked"
                    value={formData.hours_worked}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., 8 hours"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Safety Incidents</label>
                  <select name="safety_incidents" value={formData.safety_incidents} onChange={handleInputChange} required>
                    {safetyOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Supervisor Notes</label>
                  <input
                    type="text"
                    name="supervisor_notes"
                    value={formData.supervisor_notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes from supervisor"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Photos (Optional)</label>
                <input
                  type="file"
                  name="images"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*"
                  className="file-input"
                />
                <small className="help-text">You can select multiple photos</small>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i> Submit Report
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reports List */}
        <div className="reports-section">
          <h3><i className="fas fa-history"></i> Report History</h3>
          
          {loading ? (
            <div className="loading-spinner">Loading reports...</div>
          ) : (
            <div className="reports-timeline">
              {reports.length > 0 ? (
                reports.map((report, index) => (
                  <div key={report._id} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="marker-dot" style={{ background: '#f59e0b' }}></div>
                      {index < reports.length - 1 && <div className="marker-line"></div>}
                    </div>
                    
                    <div className="timeline-content">
                      <div className="report-header">
                        <div>
                          <h4 className="project-name">{report.project_name}</h4>
                          <div className="report-meta">
                            <span className="report-date">
                              <i className="fas fa-calendar"></i> {new Date(report.report_date).toLocaleDateString()}
                            </span>
                            <span className={`weather-badge weather-${report.weather_conditions}`}>
                              {weatherOptions.find(w => w.value === report.weather_conditions)?.icon && (
                                <i className={`fas ${weatherOptions.find(w => w.value === report.weather_conditions)?.icon}`}></i>
                              )}
                              {report.weather_conditions}
                            </span>
                          </div>
                        </div>
                        <span className={`safety-badge safety-${report.safety_incidents}`}>
                          {safetyOptions.find(s => s.value === report.safety_incidents)?.label.split(' ')[1] || 'OK'}
                        </span>
                      </div>

                      <div className="report-preview">
                        <p className="work-summary">
                          <strong>Work Completed:</strong> {report.work_completed.substring(0, 100)}
                          {report.work_completed.length > 100 ? '...' : ''}
                        </p>
                        
                        {report.work_planned && (
                          <p className="work-summary">
                            <strong>Planned:</strong> {report.work_planned.substring(0, 50)}...
                          </p>
                        )}
                        
                        {report.issues_encountered && (
                          <p className="work-summary" style={{color: '#ef4444'}}>
                            <strong>Issues:</strong> {report.issues_encountered.substring(0, 50)}...
                          </p>
                        )}
                        
                        <div className="report-stats">
                          {report.workers_present && (
                            <span className="stat-chip">
                              <i className="fas fa-users"></i> {report.workers_present}
                            </span>
                          )}
                          {report.hours_worked && (
                            <span className="stat-chip">
                              <i className="fas fa-clock"></i> {report.hours_worked}
                            </span>
                          )}
                          {report.material_used && (
                            <span className="stat-chip">
                              <i className="fas fa-box"></i> Materials Used
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="report-footer">
                        <span className="reported-by">
                          <i className="fas fa-user"></i> {report.foreman_name || 'Unknown'}
                        </span>
                        <div className="report-actions">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewReport(report)}
                            title="View Report"
                          >
                            <i className="fas fa-eye"></i> View
                          </button>
                          <button 
                            className="action-btn download-btn"
                            onClick={() => handleDownloadReport(report)}
                            title="Download Report"
                          >
                            <i className="fas fa-download"></i> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fas fa-clipboard-list"></i>
                  </div>
                  <h3>No Reports Found</h3>
                  <p>
                    {selectedProject 
                      ? 'No daily reports for this project yet.'
                      : 'Select a project to view daily reports.'}
                  </p>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> Create First Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyReports;
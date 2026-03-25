import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Removed unused Link
import Swal from 'sweetalert2';
import { projectsAPI } from './api';
import './ProjectTeam.css';

const ProjectTeam = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const roles = [
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'foreman', label: 'Site Foreman' },
    { value: 'engineer', label: 'Engineer' },
    { value: 'architect', label: 'Architect' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'worker', label: 'Worker' },
    { value: 'consultant', label: 'Consultant' }
  ];

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch client's projects
      const projectsData = await projectsAPI.getByClient(userId);
      setProjects(projectsData.projects || []);
      
      // Collect all team members from all projects
      const allTeamMembers = [];
      const memberMap = new Map(); // To avoid duplicates
      
      for (const project of projectsData.projects || []) {
        // Add foreman if exists
        if (project.foreman_id && project.foreman_name) {
          const key = `foreman-${project.foreman_id}`;
          if (!memberMap.has(key)) {
            memberMap.set(key, {
              id: project.foreman_id,
              name: project.foreman_name,
              role: 'foreman',
              roleLabel: 'Site Foreman',
              project: project.project_name,
              project_id: project.project_id,
              email: project.foreman_email || '',
              phone: project.foreman_phone || '',
              specialties: ['Site Management', 'Construction Oversight'],
              projects: [project.project_name]
            });
          } else {
            const member = memberMap.get(key);
            member.projects.push(project.project_name);
          }
        }
      }
      
      setTeamMembers(Array.from(memberMap.values()));
    } catch (error) {
      console.error('Error fetching team data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load team data'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const filterTeamMembers = () => {
    let filtered = [...teamMembers];
    
    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(member => 
        member.projects.includes(projects.find(p => p.project_id === selectedProject)?.project_name)
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.roleLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }
    
    setFilteredMembers(filtered);
  };

  useEffect(() => {
    filterTeamMembers();
  }, [teamMembers, selectedProject, searchTerm, roleFilter]);

  const handleViewProfile = (member) => {
    Swal.fire({
      title: 'Team Member Profile',
      html: `
        <div style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #667eea;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold;">
              ${member.name.charAt(0)}
            </div>
            <div>
              <h3 style="color: #1e293b; margin-bottom: 5px;">${member.name}</h3>
              <p style="color: #667eea; font-weight: 600;">${member.roleLabel}</p>
            </div>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h4 style="color: #1e293b; margin-bottom: 10px;">Projects Assigned</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${member.projects.map(p => `
                <span style="background: #e2e8f0; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem;">${p}</span>
              `).join('')}
            </div>
          </div>
          
          <div>
            <h4 style="color: #1e293b; margin-bottom: 10px;">Specialties</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${member.specialties.map(s => `
                <span style="background: rgba(102, 126, 234, 0.1); color: #667eea; padding: 4px 12px; border-radius: 20px; font-size: 0.9rem;">${s}</span>
              `).join('')}
            </div>
          </div>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#667eea'
    });
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

  return (
    <div className="project-team-container">
      <div className="project-team-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-users"></i>
            </div>
            <div>
              <h1>Project Team</h1>
              <p className="header-subtitle">Meet the professionals working on your projects</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Team Stats */}
        <div className="team-stats">
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{teamMembers.length}</div>
              <div className="stat-label">Total Team Members</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon roles">
              <i className="fas fa-briefcase"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{new Set(teamMembers.map(m => m.role)).size}</div>
              <div className="stat-label">Different Roles</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon projects">
              <i className="fas fa-hard-hat"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{projects.length}</div>
              <div className="stat-label">Projects</div>
            </div>
          </div>
        </div>

        {/* Filters */}
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

          <div className="filter-group">
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-filter"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {(selectedProject !== 'all' || roleFilter !== 'all' || searchTerm) && (
            <button 
              className="btn btn-secondary clear-btn"
              onClick={() => {
                setSelectedProject('all');
                setRoleFilter('all');
                setSearchTerm('');
              }}
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="loading-spinner">Loading team members...</div>
        ) : (
          <div className="team-grid">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <div key={member.id} className="team-card">
                  <div className="member-avatar">
                    {member.name.charAt(0)}
                  </div>
                  <div className="member-info">
                    <h3 className="member-name">{member.name}</h3>
                    <p className="member-role">{member.roleLabel}</p>
                    <div className="member-projects">
                      <i className="fas fa-hard-hat"></i>
                      <span>{member.projects.length} project{member.projects.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="member-specialties">
                      {member.specialties.slice(0, 2).map((s, i) => (
                        <span key={i} className="specialty-tag">{s}</span>
                      ))}
                      {member.specialties.length > 2 && (
                        <span className="specialty-tag more">+{member.specialties.length - 2}</span>
                      )}
                    </div>
                  </div>
                  <div className="member-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleViewProfile(member)}
                      title="View Profile"
                    >
                      <i className="fas fa-user"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-users"></i>
                </div>
                <h3>No Team Members Found</h3>
                <p>
                  {selectedProject !== 'all' || roleFilter !== 'all' || searchTerm
                    ? 'No team members match your search criteria.'
                    : 'No team members have been assigned to your projects yet.'}
                </p>
                {(selectedProject !== 'all' || roleFilter !== 'all' || searchTerm) && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedProject('all');
                      setRoleFilter('all');
                      setSearchTerm('');
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

export default ProjectTeam;

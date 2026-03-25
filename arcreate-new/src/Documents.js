// Documents.js - Client view without delete functionality

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Documents.css';

const API_URL = 'http://localhost:5000/api';

const Documents = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');

  const documentTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'contract', label: 'Contracts' },
    { value: 'blueprint', label: 'Blueprints' },
    { value: 'permit', label: 'Permits' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'report', label: 'Reports' },
    { value: 'photo', label: 'Photos' },
    { value: 'other', label: 'Other' }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch client's projects
      const projectsResponse = await fetch(`${API_URL}/projects/client/${userId}`);
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);
      
      // Fetch documents
      const documentsResponse = await fetch(`${API_URL}/documents/client/${userId}`);
      const documentsData = await documentsResponse.json();
      setDocuments(documentsData.documents || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load documents'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, selectedProject, searchTerm, documentTypeFilter]);

  const filterDocuments = () => {
    let filtered = [...documents];
    
    // Filter by project
    if (selectedProject !== 'all') {
      filtered = filtered.filter(d => d.project_id === selectedProject);
    }
    
    // Filter by document type
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(d => d.document_type === documentTypeFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredDocuments(filtered);
  };

  const handleOpenLink = async (doc) => {
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

  const handleView = (doc) => {
    Swal.fire({
      title: doc.document_name,
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.8rem; opacity: 0.9;">Document Details</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${doc.document_name}</div>
              </div>
              <div class="document-type-badge" style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px;">
                ${doc.document_type}
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-project-diagram"></i> Project
              </div>
              <div style="font-weight: 600;">${doc.project_name}</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-calendar"></i> Upload Date
              </div>
              <div style="font-weight: 600;">${new Date(doc.upload_date).toLocaleDateString()}</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
              <i class="fas fa-link"></i> Document Link
            </div>
            <div style="font-weight: 600; word-break: break-all;">
              <a href="${doc.file_url}" target="_blank" rel="noopener noreferrer" style="color: #667eea;">
                ${doc.file_url.substring(0, 50)}...
              </a>
            </div>
          </div>
          
          ${doc.description ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <div style="color: #92400e; font-size: 0.8rem; margin-bottom: 8px;">
                <i class="fas fa-align-left"></i> Description
              </div>
              <div style="color: #78350f;">${doc.description}</div>
            </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; color: #64748b; font-size: 0.75rem; text-align: center;">
            <i class="fas fa-info-circle"></i> Click "Open Link" to view this document
          </div>
        </div>
      `,
      width: '550px',
      showCancelButton: true,
      confirmButtonText: 'Open Link',
      cancelButtonText: 'Close',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      reverseButtons: false
    }).then((result) => {
      if (result.isConfirmed) {
        handleOpenLink(doc);
      }
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

  const getTypeLabel = (type) => {
    const labels = {
      contract: 'Contract',
      blueprint: 'Blueprint',
      permit: 'Permit',
      invoice: 'Invoice',
      report: 'Report',
      photo: 'Photo',
      other: 'Other'
    };
    return labels[type] || type;
  };

  return (
    <div className="documents-container">
      <div className="documents-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <h1>Document Repository</h1>
              <p className="header-subtitle">Access your project documents and files</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📄</div>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">Total Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏗️</div>
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Projects</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-section">
          <div className="filter-group">
            <label>Filter by Project:</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Filter by Type:</label>
            <select value={documentTypeFilter} onChange={(e) => setDocumentTypeFilter(e.target.value)}>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="search-group">
            <label>Search Documents:</label>
            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          
          {(selectedProject !== 'all' || documentTypeFilter !== 'all' || searchTerm) && (
            <button 
              className="btn-clear-filters"
              onClick={() => {
                setSelectedProject('all');
                setDocumentTypeFilter('all');
                setSearchTerm('');
              }}
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="loading-spinner">Loading documents...</div>
        ) : (
          <div className="documents-grid">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map(doc => (
                <div key={doc._id} className="document-card">
                  <div className="document-icon">
                    <i className={`fas ${getDocumentIcon(doc.document_type)}`}></i>
                  </div>
                  <div className="document-info">
                    <h3 className="document-name">{doc.document_name}</h3>
                    <p className="document-project">{doc.project_name}</p>
                    <div className="document-meta">
                      <span className={`document-type-badge type-${doc.document_type}`}>
                        {getTypeLabel(doc.document_type)}
                      </span>
                      <span className="document-date">
                        <i className="fas fa-calendar"></i> {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                      {doc.file_size && (
                        <span className="document-size">
                          <i className="fas fa-database"></i> {doc.file_size}
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="document-description">{doc.description}</p>
                    )}
                  </div>
                  <div className="document-actions">
                    <button
                      className="action-btn view-btn"
                      onClick={() => handleView(doc)}
                      title="View Details"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      className="action-btn open-link-btn"
                      onClick={() => handleOpenLink(doc)}
                      title="Open Link"
                    >
                      <i className="fas fa-external-link-alt"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-folder-open empty-icon"></i>
                <h3>No Documents Found</h3>
                <p>
                  {searchTerm || selectedProject !== 'all' || documentTypeFilter !== 'all'
                    ? 'No documents match your search criteria.'
                    : 'Documents will appear here once shared by your project team.'}
                </p>
                {(searchTerm || selectedProject !== 'all' || documentTypeFilter !== 'all') && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setSelectedProject('all');
                      setDocumentTypeFilter('all');
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

export default Documents;
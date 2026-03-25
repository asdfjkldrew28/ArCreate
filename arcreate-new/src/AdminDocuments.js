// AdminDocuments.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import './AdminDocuments.css';

const API_URL = 'http://localhost:5000/api';

const AdminDocuments = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [editingDoc, setEditingDoc] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const [editFormData, setEditFormData] = useState({
    document_name: '',
    document_type: 'contract',
    description: '',
    file_url: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all documents (admin sees all)
      const documentsResponse = await fetch(`${API_URL}/documents/all`);
      const documentsData = await documentsResponse.json();
      
      if (documentsData.success) {
        setDocuments(documentsData.documents || []);
      } else {
        console.error('Failed to fetch documents:', documentsData);
        setDocuments([]);
      }
      
      // Fetch all projects
      const projectsResponse = await fetch(`${API_URL}/projects`);
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);
      
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
        d.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredDocuments(filtered);
  };

  const handleOpenLink = (doc) => {
    if (!doc || !doc.file_url) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No document link available'
      });
      return;
    }
    window.open(doc.file_url, '_blank');
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setEditFormData({
      document_name: doc.document_name,
      document_type: doc.document_type,
      description: doc.description || '',
      file_url: doc.file_url || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    
    if (!editFormData.file_url) {
      Swal.fire({
        icon: 'warning',
        title: 'No Link Provided',
        text: 'Please enter a valid link'
      });
      return;
    }
    
    if (!editFormData.document_name) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Document Name',
        text: 'Please enter a document name'
      });
      return;
    }

    // Validate URL format
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(editFormData.file_url)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid URL',
        text: 'Please enter a valid URL'
      });
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/documents/${editingDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_name: editFormData.document_name,
          document_type: editFormData.document_type,
          description: editFormData.description,
          file_url: editFormData.file_url,
          username: username,
          role: userRole
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Document has been updated successfully.',
          timer: 1500
        });
        
        setShowEditForm(false);
        setEditingDoc(null);
        fetchData(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to update document');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update document'
      });
    }
  };

  const handleDeleteDocument = async (doc) => {
    const result = await Swal.fire({
      title: 'Delete Document?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Delete document:<br>
            <strong>"${doc.document_name}"</strong>?
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
      setDeleting(true);
      try {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        const username = localStorage.getItem('username');

        const response = await fetch(`${API_URL}/documents/${doc._id}`, {
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
          
          fetchData(); // Refresh the list
        } else {
          throw new Error(data.message || 'Delete failed');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete document'
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleViewDetails = (doc) => {
    Swal.fire({
      title: 'Document Details',
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 0.8rem; opacity: 0.9;">Document Details</div>
                <div style="font-size: 1.2rem; font-weight: bold;">${doc.document_name}</div>
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 20px;">
                ${doc.document_type}
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-project-diagram"></i> Project
              </div>
              <div style="font-weight: 600;">${doc.project_name || 'N/A'}</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px;">
              <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
                <i class="fas fa-calendar"></i> Upload Date
              </div>
              <div style="font-weight: 600;">${new Date(doc.upload_date).toLocaleString()}</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
              <i class="fas fa-user"></i> Uploaded By
            </div>
            <div style="font-weight: 600;">${doc.uploaded_by_name || 'Admin'}</div>
          </div>
          
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <div style="color: #64748b; font-size: 0.7rem; margin-bottom: 5px;">
              <i class="fas fa-link"></i> Document Link
            </div>
            <div style="font-weight: 600; word-break: break-all;">
              <a href="${doc.file_url}" target="_blank" rel="noopener noreferrer" style="color: #667eea;">
                ${doc.file_url}
              </a>
            </div>
          </div>
          
          ${doc.description ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
              <div style="color: #92400e; font-size: 0.8rem; margin-bottom: 8px;">
                <i class="fas fa-align-left"></i> Description
              </div>
              <div style="color: #78350f;">${doc.description}</div>
            </div>
          ` : ''}
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

  return (
    <div className="admin-documents-container">
      <div className="admin-documents-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-folder-open"></i>
            </div>
            <div>
              <h1>Document Management</h1>
              <p className="header-subtitle">Manage shared documents across all projects</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">📄</div>
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">Total Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon projects">🏗️</div>
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon types">📑</div>
            <div className="stat-value">{documentTypes.length - 1}</div>
            <div className="stat-label">Document Types</div>
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
                placeholder="Search by name, project, description..."
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

        {/* Edit Modal */}
        {showEditForm && editingDoc && (
          <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Document - {editingDoc.document_name}</h3>
                <button className="modal-close" onClick={() => setShowEditForm(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdateDocument}>
                  <div className="form-group">
                    <label className="required">Document Name</label>
                    <input
                      type="text"
                      value={editFormData.document_name}
                      onChange={(e) => setEditFormData({ ...editFormData, document_name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="required">Document Type</label>
                    <select 
                      value={editFormData.document_type} 
                      onChange={(e) => setEditFormData({ ...editFormData, document_type: e.target.value })}
                      required
                    >
                      {documentTypes.filter(t => t.value !== 'all').map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="required">Document Link (URL)</label>
                    <input
                      type="url"
                      value={editFormData.file_url}
                      onChange={(e) => setEditFormData({ ...editFormData, file_url: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      rows="3"
                    ></textarea>
                  </div>
                  
                  <div className="btn-group">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save"></i> Update Document
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditForm(false)}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Documents Table */}
        {loading ? (
          <div className="loading-spinner">Loading documents...</div>
        ) : (
          <div className="table-container">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length > 0 ? (
                  filteredDocuments.map(doc => (
                    <tr key={doc._id}>
                      <td>
                        <div className="document-name-cell">
                          <i className={`fas ${getDocumentIcon(doc.document_type)}`}></i>
                          <span>{doc.document_name}</span>
                        </div>
                        {doc.description && (
                          <div className="document-desc-preview">{doc.description.substring(0, 60)}...</div>
                        )}
                      </td>
                      <td>{doc.project_name || 'N/A'}</td>
                      <td>
                        <span className={`doc-type-badge type-${doc.document_type}`}>
                          {doc.document_type}
                        </span>
                      </td>
                      <td>{doc.uploaded_by_name || 'Admin'}</td>
                      <td>{new Date(doc.upload_date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-btn"
                            onClick={() => handleViewDetails(doc)}
                            title="View Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="action-btn open-btn"
                            onClick={() => handleOpenLink(doc)}
                            title="Open Link"
                          >
                            <i className="fas fa-external-link-alt"></i>
                          </button>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(doc)}
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteDocument(doc)}
                            disabled={deleting}
                            title="Delete"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center">
                      <div className="empty-state">
                        <i className="fas fa-folder-open empty-icon"></i>
                        <h3>No Documents Found</h3>
                        <p>
                          {searchTerm || selectedProject !== 'all' || documentTypeFilter !== 'all'
                            ? 'No documents match your search criteria.'
                            : 'No documents have been shared yet.'}
                        </p>
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

export default AdminDocuments;
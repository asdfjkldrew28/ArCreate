import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { materialsAPI } from './api';
import './ViewMaterial.css';

const ViewMaterial = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterial();
  }, [id]);

  const fetchMaterial = async () => {
    setLoading(true);
    try {
      const data = await materialsAPI.getById(id);
      setMaterial(data.material);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch material data'
      }).then(() => {
        navigate('/inventory');
      });
    } finally {
      setLoading(false);
    }
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

  const getStockStatus = () => {
    if (!material) return { class: '', text: '' };
    if (material.quantity <= 0) return { class: 'critical', text: 'Out of Stock' };
    if (material.quantity <= material.reorder_level) return { class: 'critical', text: 'Critical Low!' };
    if (material.quantity <= material.min_stock_level) return { class: 'low', text: 'Low Stock' };
    return { class: 'normal', text: 'In Stock' };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      construction: '🏗️',
      hardware: '🔧',
      electrical: '⚡',
      plumbing: '🚰',
      finishing: '🎨',
      tools: '🛠️',
      safety: '🦺',
      office: '📁'
    };
    return icons[category] || '📦';
  };

  if (loading) {
    return (
      <div className="view-material-container">
        <div className="loading-spinner">Loading material details...</div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="view-material-container">
        <div className="error-message">Material not found</div>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const totalValue = material.quantity * material.unit_price;

  return (
    <div className="view-material-container">
      <div className="view-material-card">
        <div className="header">
          <div className="header-icon">
            <i className="fas fa-info-circle"></i>
          </div>
          <div>
            <h1>Material Details</h1>
            <p className="header-subtitle">Complete information about this construction material</p>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="material-details">
          {/* Basic Information */}
          <div className="detail-card">
            <h3><i className="fas fa-clipboard-list"></i> Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Material Name</div>
                <div className="detail-value">{material.material_name}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Category</div>
                <div className="detail-value">
                  <span className={`category-badge category-${material.category}`}>
                    {getCategoryIcon(material.category)} {material.category}
                  </span>
                </div>
              </div>
              <div className="detail-item full-width">
                <div className="detail-label">Description</div>
                <div className="detail-value description-box">
                  {material.description || 'No description provided'}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Storage Location</div>
                <div className="detail-value">
                  <i className="fas fa-map-marker-alt location-icon"></i>
                  {material.location || 'Not specified'}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Information */}
          <div className="detail-card">
            <h3><i className="fas fa-chart-bar"></i> Stock Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Current Quantity</div>
                <div className="detail-value stock-quantity">
                  {material.quantity} {material.unit}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Stock Status</div>
                <div className={`stock-status ${stockStatus.class}`}>
                  <i className="fas fa-circle"></i> {stockStatus.text}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Unit Price</div>
                <div className="detail-value price-value">
                  ₱{Number(material.unit_price).toFixed(2)}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Total Value</div>
                <div className="detail-value price-value">
                  ₱{totalValue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Levels */}
          <div className="detail-card">
            <h3><i className="fas fa-exclamation-triangle"></i> Stock Levels</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Minimum Stock Level</div>
                <div className="detail-value">{material.min_stock_level} {material.unit}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Reorder Level</div>
                <div className="detail-value">{material.reorder_level} {material.unit}</div>
              </div>
            </div>

            <div className="stock-visualization">
              <div className="visualization-labels">
                <span className="reorder-label">Reorder: {material.reorder_level}</span>
                <span className="min-label">Min: {material.min_stock_level}</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${Math.min(100, (material.quantity / Math.max(1, material.min_stock_level * 1.5)) * 100)}%`,
                    background: stockStatus.class === 'critical' ? '#ef4444' : 
                               stockStatus.class === 'low' ? '#f59e0b' : '#10b981'
                  }}
                >
                  <div className="current-marker">
                    {material.quantity}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="detail-card">
            <h3><i className="fas fa-cog"></i> System Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Material Status</div>
                <div className="detail-value">
                  <span className={`status-badge ${material.status}`}>
                    {material.status}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Material ID</div>
                <div className="detail-value">#{material._id.toString().slice(-6)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Created On</div>
                <div className="detail-value">
                  {new Date(material.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Last Updated</div>
                <div className="detail-value">
                  {material.updated_at ? new Date(material.updated_at).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <Link to="/inventory" className="btn btn-secondary">
            <i className="fas fa-arrow-left"></i> Back to Inventory
          </Link>
          {userRole === 'admin' && (
            <Link to={`/edit-material/${material._id}`} className="btn btn-primary">
              <i className="fas fa-edit"></i> Edit Material
            </Link>
          )}
          {userRole === 'client' && (
            <Link to={`/request-quote?material_id=${material._id}`} className="btn btn-success">
              <i className="fas fa-file-invoice-dollar"></i> Request Quote
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewMaterial;
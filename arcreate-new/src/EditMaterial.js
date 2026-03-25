import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import { materialsAPI } from './api';
import './EditMaterial.css';

const EditMaterial = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    material_name: '',
    category: '',
    description: '',
    quantity: '',
    unit: 'pcs',
    unit_price: '',
    location: '',
    min_stock_level: '10',
    reorder_level: '5',
    status: 'available'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to edit materials. Please submit a material request instead.',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/inventory');
      });
      return;
    }
    fetchMaterial();
  }, [id, userRole, navigate]);

  const fetchMaterial = async () => {
    setLoading(true);
    try {
      const data = await materialsAPI.getById(id);
      setFormData(data.material);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validation
    if (parseFloat(formData.unit_price) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Price',
        text: 'Unit price must be greater than 0'
      });
      setSaving(false);
      return;
    }

    if (parseInt(formData.quantity) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Quantity cannot be negative'
      });
      setSaving(false);
      return;
    }

    try {
      await materialsAPI.update(id, formData, username, userRole);

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Material updated successfully!',
        timer: 1500
      }).then(() => {
        navigate('/inventory');
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update material'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Material?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px;">
            Delete material:<br>
            <strong>"${formData.material_name}"</strong>?
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
      try {
        await materialsAPI.delete(id, username, userRole);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Material has been deleted.',
          timer: 1500
        }).then(() => {
          navigate('/inventory');
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Delete failed'
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

  const categories = [
    { value: 'construction', label: '🏗️ Construction' },
    { value: 'hardware', label: '🔧 Hardware' },
    { value: 'electrical', label: '⚡ Electrical' },
    { value: 'plumbing', label: '🚰 Plumbing' },
    { value: 'finishing', label: '🎨 Finishing' },
    { value: 'tools', label: '🛠️ Tools' },
    { value: 'safety', label: '🦺 Safety' },
    { value: 'office', label: '📁 Office' }
  ];

  const units = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'bags', label: 'Bags' },
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'm', label: 'Meters (m)' },
    { value: 'roll', label: 'Rolls' },
    { value: 'set', label: 'Sets' },
    { value: 'box', label: 'Boxes' },
    { value: 'liter', label: 'Liters' }
  ];

  if (loading) {
    return (
      <div className="edit-material-container">
        <div className="loading-spinner">Loading material data...</div>
      </div>
    );
  }

  return (
    <div className="edit-material-container">
      <div className="edit-material-card">
        <div className="header">
          <div className="header-icon">
            <i className="fas fa-edit"></i>
          </div>
          <div>
            <h1>Edit Material</h1>
            <p className="header-subtitle">Update material details and stock information</p>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="material-info">
          <strong>Current Status:</strong>
          <span className="info-value">{formData.quantity} {formData.unit} in stock</span>
          <span className="separator">|</span>
          <strong>Category:</strong>
          <span className="info-value">{formData.category}</span>
          <span className="separator">|</span>
          <strong>Last Updated:</strong>
          <span className="info-value">{formData.updated_at ? new Date(formData.updated_at).toLocaleDateString() : 'Never'}</span>
        </div>

        <form onSubmit={handleSubmit} className="material-form">
          <div className="form-group">
            <label className="required">Material Name</label>
            <input
              type="text"
              name="material_name"
              value={formData.material_name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} required>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="required">Current Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Unit</label>
              <select name="unit" value={formData.unit} onChange={handleInputChange} required>
                {units.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="required">Unit Price (₱)</label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows="3"
            ></textarea>
          </div>

          <div className="form-group">
            <label>Storage Location</label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange}>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Minimum Stock Level</label>
              <input
                type="number"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Reorder Level</label>
              <input
                type="number"
                name="reorder_level"
                value={formData.reorder_level}
                onChange={handleInputChange}
                min="0"
              />
            </div>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fas fa-save"></i> {saving ? 'Updating...' : 'Update Material'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/inventory')}>
              <i className="fas fa-times"></i> Cancel
            </button>
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <i className="fas fa-trash"></i> Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMaterial;
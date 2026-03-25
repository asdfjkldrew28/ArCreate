import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { materialsAPI } from './api';
import './AddMaterial.css';

const AddMaterial = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    material_name: '',
    category: '',
    description: '',
    quantity: '',
    unit: 'pcs',
    unit_price: '',
    location: '',
    min_stock_level: '10',
    reorder_level: '5'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Access Denied',
        text: 'You do not have permission to add materials. Please submit a material request instead.',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        navigate('/inventory');
      });
    }
  }, [userRole, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (parseFloat(formData.unit_price) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Price',
        text: 'Unit price must be greater than 0'
      });
      setLoading(false);
      return;
    }

    if (parseInt(formData.quantity) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Quantity cannot be negative'
      });
      setLoading(false);
      return;
    }

    try {
      await materialsAPI.create(formData, username, userRole);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Material added successfully!',
        timer: 1500
      }).then(() => {
        navigate('/inventory');
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add material'
      });
    } finally {
      setLoading(false);
    }
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
    <div className="add-material-container">
      <div className="add-material-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div>
              <h1>Add New Construction Material</h1>
              <p className="header-subtitle">Register new materials for inventory tracking</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="stock-level-info">
          <h4>📊 Stock Level Guidelines:</h4>
          <ul>
            <li><strong>Minimum Stock Level:</strong> When stock reaches this level, it will show as "Low Stock"</li>
            <li><strong>Reorder Level:</strong> When stock reaches this level, it will trigger critical alerts</li>
            <li>Recommended: Set Reorder Level lower than Minimum Stock Level</li>
          </ul>
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
              placeholder="e.g., Cement, Steel Bars, PVC Pipes"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} required>
                <option value="">Select Category</option>
                <option value="construction">🏗️ Construction</option>
                <option value="hardware">🔧 Hardware</option>
                <option value="electrical">⚡ Electrical</option>
                <option value="plumbing">🚰 Plumbing</option>
                <option value="finishing">🎨 Finishing</option>
                <option value="tools">🛠️ Tools</option>
                <option value="safety">🦺 Safety</option>
                <option value="office">📁 Office</option>
              </select>
            </div>

            <div className="form-group">
              <label className="required">Initial Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Unit</label>
              <select name="unit" value={formData.unit} onChange={handleInputChange} required>
                <option value="pcs">Pieces (pcs)</option>
                <option value="bags">Bags</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="m">Meters (m)</option>
                <option value="roll">Rolls</option>
                <option value="set">Sets</option>
                <option value="box">Boxes</option>
                <option value="liter">Liters</option>
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
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="required">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows="3"
              placeholder="Material specifications, brand, grade, etc. (required)"
            ></textarea>
          </div>

          <div className="form-group">
            <label className="required">Storage Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              placeholder="e.g., Warehouse A, Shelf 3 (required)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Minimum Stock Level</label>
              <input
                type="number"
                name="min_stock_level"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                required
                min="1"
              />
            </div>

            <div className="form-group">
              <label className="required">Reorder Level</label>
              <input
                type="number"
                name="reorder_level"
                value={formData.reorder_level}
                onChange={handleInputChange}
                required
                min="0"
              />
            </div>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <i className="fas fa-save"></i> {loading ? 'Saving...' : 'Save Material'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/inventory')}>
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial;
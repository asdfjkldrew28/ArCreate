import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { materialsAPI } from './api';
import './Inventory.css';

const API_URL = 'http://localhost:5000/api';

const Inventory = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalItems: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0
  });
  const [categoryStats, setCategoryStats] = useState({});
  const [loading, setLoading] = useState(true);

  const categories = {
    construction: { icon: '🏗️', color: '#667eea' },
    hardware: { icon: '🔧', color: '#ff9e6d' },
    electrical: { icon: '⚡', color: '#ffd166' },
    plumbing: { icon: '🚰', color: '#56ab91' },
    finishing: { icon: '🎨', color: '#a78bfa' },
    tools: { icon: '🛠️', color: '#f97316' },
    safety: { icon: '🦺', color: '#ef4444' },
    office: { icon: '📁', color: '#6b7280' }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await materialsAPI.getAll();
      setMaterials(data.materials);
      calculateStats(data.materials);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch materials'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (materials) => {
    let totalItems = materials.length;
    let inventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let categoryCounts = {};

    materials.forEach(item => {
      inventoryValue += item.quantity * item.unit_price;

      if (item.quantity <= 0) {
        outOfStockCount++;
      } else if (item.quantity <= item.min_stock_level) {
        lowStockCount++;
      }

      if (!categoryCounts[item.category]) {
        categoryCounts[item.category] = { count: 0, outOfStock: 0, lowStock: 0 };
      }
      categoryCounts[item.category].count++;
      if (item.quantity <= 0) categoryCounts[item.category].outOfStock++;
      else if (item.quantity <= item.min_stock_level) categoryCounts[item.category].lowStock++;
    });

    setStats({
      totalItems,
      inventoryValue,
      lowStockCount,
      outOfStockCount
    });
    setCategoryStats(categoryCounts);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchMaterials();
      return;
    }

    try {
      const data = await materialsAPI.search(searchTerm);
      setMaterials(data.materials);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Search failed'
      });
    }
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Delete Material?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px;">
            Delete construction material:<br>
            <strong>"${name}"</strong>?
          </p>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This will remove the material from inventory!
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
        });
        fetchMaterials();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Delete failed'
        });
      }
    }
  };

  // Get the appropriate dashboard path based on role
  const getDashboardPath = () => {
    switch(userRole) {
      case 'admin': return '/dashboard-admin';
      case 'foreman': return '/dashboard-foreman';
      case 'client': return '/client-dashboard';
      default: return '/login';
    }
  };

  // Handle back button - navigate to appropriate dashboard
  const handleBack = () => {
    navigate(getDashboardPath());
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

  const getStockStatus = (item) => {
    if (item.quantity <= 0) return { class: 'critical', text: 'Out of Stock' };
    if (item.quantity <= item.reorder_level) return { class: 'critical', text: 'Critical Low!' };
    if (item.quantity <= item.min_stock_level) return { class: 'low', text: 'Low Stock' };
    return { class: 'normal', text: 'In Stock' };
  };

  return (
    <div className="inventory-page">
      {/* Header Section - FIXED LAYOUT */}
      <div className="inventory-header">
        <div className="header-left-section">
          <button className="back-btn" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <div className="logo-container">
            <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          </div>
          <div className="title-section">
            <h1>ArCreate Materials Inventory</h1>
            <p className="header-subtitle">Construction Materials Management System</p>
          </div>
        </div>

        <div className="header-right-section">
          <div className="user-info">
            <div className="user-avatar">
              {fullName ? fullName.charAt(0).toUpperCase() : username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name">{fullName || username}</div>
              <div className="user-role">
                <span className={`role-badge role-${userRole}`}>
                  {userRole === 'admin' && '👑 Admin'}
                  {userRole === 'foreman' && '👷 Foreman'}
                  {userRole === 'client' && '👤 Client'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <i className="fas fa-boxes"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Total Materials</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon construction">
            <i className="fas fa-hard-hat"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.inventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div className="stat-label">Inventory Value</div>
          </div>
        </div>

        {stats.lowStockCount > 0 && (
          <div className="stat-card">
            <div className="stat-icon low">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.lowStockCount}</div>
              <div className="stat-label">Low Stock Items</div>
            </div>
          </div>
        )}

        {stats.outOfStockCount > 0 && (
          <div className="stat-card">
            <div className="stat-icon out">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.outOfStockCount}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="category-section">
        <h3><i className="fas fa-layer-group"></i> Materials by Category</h3>
        <div className="category-grid">
          {Object.entries(categoryStats).map(([category, data]) => (
            data.count > 0 && (
              <div key={category} className="category-card" style={{ borderLeftColor: categories[category]?.color }}>
                <div className="category-header">
                  <div className="category-icon">{categories[category]?.icon}</div>
                  <div>
                    <div className="category-name">{category.charAt(0).toUpperCase() + category.slice(1)}</div>
                    <div className="category-count" style={{ color: categories[category]?.color }}>{data.count}</div>
                  </div>
                </div>
                <div className="category-stats">
                  {data.outOfStock > 0 && <span className="stat-out">{data.outOfStock} out of stock</span>}
                  {data.lowStock > 0 && <span className="stat-low">{data.lowStock} low stock</span>}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="actions-bar">
        <form onSubmit={handleSearch} className="search-container">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search materials by name, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="search-btn">
            <i className="fas fa-search"></i> Search
          </button>
        </form>

        <div className="actions-buttons">
          {userRole === 'admin' && (
            <Link to="/add-material" className="btn btn-success">
              <i className="fas fa-plus"></i> Add Material
            </Link>
          )}

          <button onClick={handleLogout} className="btn btn-danger">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      {/* Materials Table */}
      <div className="table-container">
        <table className="materials-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Material Name</th>
              <th>Category</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>Location</th>
              <th>Stock Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="text-center">
                  <div className="loading-spinner">Loading...</div>
                </td>
              </tr>
            ) : materials.length > 0 ? (
              materials.map(item => {
                const stockStatus = getStockStatus(item);
                const totalValue = item.quantity * item.unit_price;

                return (
                  <tr key={item._id}>
                    <td>#{item._id.toString().slice(-6)}</td>
                    <td>
                      <div className="material-name">{item.material_name}</div>
                      <div className={`stock-alert ${stockStatus.class}`}>
                        {stockStatus.text}
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge category-${item.category}`}>
                        {categories[item.category]?.icon || '📦'} {item.category}
                      </span>
                    </td>
                    <td>{item.description || 'No description'}</td>
                    <td className="quantity-cell">
                      <span className={`stock-indicator ${stockStatus.class}`}></span>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="material-value">₱{Number(item.unit_price).toFixed(2)}</td>
                    <td className="material-value">₱{totalValue.toFixed(2)}</td>
                    <td>
                      <i className="fas fa-map-marker-alt location-icon"></i>
                      {item.location || 'Not specified'}
                    </td>
                    <td>
                      <span className={`stock-alert ${stockStatus.class}`}>
                        {stockStatus.text}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/view-material/${item._id}`} className="action-btn view-btn" title="View">
                          <i className="fas fa-eye"></i> View
                        </Link>
                        {userRole === 'admin' && (
                          <>
                            <Link to={`/edit-material/${item._id}`} className="action-btn edit-btn" title="Edit">
                              <i className="fas fa-edit"></i> Edit
                            </Link>
                            <button 
                              className="action-btn delete-btn" 
                              onClick={() => handleDelete(item._id, item.material_name)}
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10">
                  <div className="no-results">
                    <div className="no-results-icon">
                      <i className="fas fa-box-open"></i>
                    </div>
                    <h3>No Materials Found</h3>
                    <p>No construction materials found in inventory.</p>
                    {['admin', 'foreman'].includes(userRole) && (
                      <Link to="/add-material" className="btn btn-success">
                        <i className="fas fa-plus"></i> Add Your First Material
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
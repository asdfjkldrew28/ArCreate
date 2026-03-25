// Suppliers.js - Updated version with Price Comparison removed and Search added

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { suppliersAPI } from './api';
import './Suppliers.css';

const Suppliers = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]); // Add this for filtered purchases
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState(''); // Add search term for purchases
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalPurchases: 0,
    totalSpent: 0,
    averageOrderValue: 0,
    cheapestSupplier: '',
    mostExpensiveSupplier: ''
  });

  // Country codes with flags for international format
  const countryCodes = [
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦' },
    { code: '+968', country: 'Oman', flag: '🇴🇲' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
    { code: '+20', country: 'Egypt', flag: '🇪🇬' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+39', country: 'Italy', flag: '🇮🇹' },
    { code: '+34', country: 'Spain', flag: '🇪🇸' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭' },
    { code: '+43', country: 'Austria', flag: '🇦🇹' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪' },
    { code: '+47', country: 'Norway', flag: '🇳🇴' },
    { code: '+358', country: 'Finland', flag: '🇫🇮' },
    { code: '+48', country: 'Poland', flag: '🇵🇱' },
    { code: '+420', country: 'Czech Republic', flag: '🇨🇿' },
    { code: '+36', country: 'Hungary', flag: '🇭🇺' },
    { code: '+30', country: 'Greece', flag: '🇬🇷' },
    { code: '+90', country: 'Turkey', flag: '🇹🇷' },
    { code: '+7', country: 'Russia', flag: '🇷🇺' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+51', country: 'Peru', flag: '🇵🇪' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿' },
    { code: '+679', country: 'Fiji', flag: '🇫🇯' },
    { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬' }
  ].sort((a, b) => a.country.localeCompare(b.country));

  // Supplier form state
  const [supplierForm, setSupplierForm] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    products: [],
    productsInput: '',
    payment_terms: 'net30',
    status: 'active',
    notes: '',
    countryCode: '+63'
  });

  // Purchase form state
  const [purchaseForm, setPurchaseForm] = useState({
    supplier_id: '',
    material_id: '',
    quantity: '',
    unit_price: '',
    total_amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    payment_status: 'pending',
    notes: ''
  });

  const paymentTerms = [
    { value: 'net15', label: 'Net 15' },
    { value: 'net30', label: 'Net 30' },
    { value: 'net45', label: 'Net 45' },
    { value: 'net60', label: 'Net 60' },
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'prepaid', label: 'Prepaid' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // Filter purchases when search term changes
  useEffect(() => {
    filterPurchases();
  }, [purchases, purchaseSearchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const suppliersData = await suppliersAPI.getAll();
      const purchasesData = await suppliersAPI.getAllPurchases();
      const materialsData = await suppliersAPI.getAllMaterials();
      
      setSuppliers(suppliersData.suppliers || []);
      setPurchases(purchasesData.purchases || []);
      setFilteredPurchases(purchasesData.purchases || []); // Initialize filtered purchases
      setMaterials(materialsData.materials || []);
      
      calculateStats(suppliersData.suppliers || [], purchasesData.purchases || []);
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
  };

  // New function to filter purchases based on search term
  const filterPurchases = () => {
    if (!purchaseSearchTerm.trim()) {
      setFilteredPurchases(purchases);
      return;
    }

    const searchLower = purchaseSearchTerm.toLowerCase().trim();
    const filtered = purchases.filter(purchase => 
      purchase.supplier_name?.toLowerCase().includes(searchLower) ||
      purchase.material_name?.toLowerCase().includes(searchLower) ||
      purchase.invoice_number?.toLowerCase().includes(searchLower) ||
      purchase.notes?.toLowerCase().includes(searchLower)
    );
    
    setFilteredPurchases(filtered);
  };

  const calculateStats = (suppliersList, purchasesList) => {
    const totalSuppliers = suppliersList.length;
    const totalPurchases = purchasesList.length;
    const totalSpent = purchasesList.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const averageOrderValue = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    // Find cheapest and most expensive suppliers based on average prices
    const supplierPrices = {};
    purchasesList.forEach(p => {
      if (!supplierPrices[p.supplier_id]) {
        supplierPrices[p.supplier_id] = { total: 0, count: 0, name: p.supplier_name };
      }
      supplierPrices[p.supplier_id].total += p.unit_price || 0;
      supplierPrices[p.supplier_id].count++;
    });

    let cheapestSupplier = '';
    let mostExpensiveSupplier = '';
    let cheapestAvg = Infinity;
    let mostExpensiveAvg = 0;

    Object.values(supplierPrices).forEach(s => {
      const avg = s.total / s.count;
      if (avg < cheapestAvg) {
        cheapestAvg = avg;
        cheapestSupplier = s.name;
      }
      if (avg > mostExpensiveAvg) {
        mostExpensiveAvg = avg;
        mostExpensiveSupplier = s.name;
      }
    });

    setStats({
      totalSuppliers,
      totalPurchases,
      totalSpent,
      averageOrderValue,
      cheapestSupplier,
      mostExpensiveSupplier
    });
  };

  const handleSupplierInputChange = (e) => {
    const { name, value } = e.target;
    setSupplierForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePurchaseInputChange = (e) => {
    const { name, value } = e.target;
    setPurchaseForm(prev => ({ ...prev, [name]: value }));
    
    // Auto-calculate total amount
    if (name === 'quantity' || name === 'unit_price') {
      const quantity = parseFloat(name === 'quantity' ? value : purchaseForm.quantity) || 0;
      const unitPrice = parseFloat(name === 'unit_price' ? value : purchaseForm.unit_price) || 0;
      setPurchaseForm(prev => ({
        ...prev,
        total_amount: (quantity * unitPrice).toFixed(2)
      }));
    }
  };

  const handleViewSupplierDetails = async (supplierId) => {
    setLoading(true);
    try {
      const data = await suppliersAPI.getSupplierDetails(supplierId);
      setSelectedSupplier(data);
      setShowSupplierDetails(true);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load supplier details'
      });
    } finally {
      setLoading(false);
    }
  };

  const closeSupplierDetails = () => {
    setShowSupplierDetails(false);
    setSelectedSupplier(null);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!supplierForm.contact_person) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Contact Person',
        text: 'Contact person is required'
      });
      return;
    }

    if (!supplierForm.address) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Address',
        text: 'Complete address is required'
      });
      return;
    }

    try {
      await suppliersAPI.create(supplierForm, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Supplier added successfully!',
        timer: 1500
      });
      
      setSupplierForm({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        products: [],
        payment_terms: 'net30',
        status: 'active',
        notes: '',
        countryCode: '+63'
      });
      
      fetchData();
      setActiveTab('suppliers');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add supplier'
      });
    }
  };

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!purchaseForm.invoice_number) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Invoice Number',
        text: 'Invoice number is required'
      });
      return;
    }

    try {
      await suppliersAPI.createPurchase(purchaseForm, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Purchase recorded successfully!',
        timer: 1500
      });
      
      setPurchaseForm({
        supplier_id: '',
        material_id: '',
        quantity: '',
        unit_price: '',
        total_amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        payment_status: 'pending',
        notes: ''
      });
      
      fetchData();
      setActiveTab('purchases');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to record purchase'
      });
    }
  };

  const handleEditSupplier = (supplierId) => {
    navigate(`/edit-supplier/${supplierId}`);
  };

  const handleDeleteSupplier = async (supplierId, companyName) => {
    const result = await Swal.fire({
      title: 'Delete Supplier?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px;">
            Delete supplier:<br>
            <strong>"${companyName}"</strong>?
          </p>
          <p style="color: #ef4444; font-weight: 600; font-size: 1rem;">
            This will also delete all purchase records!
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        await suppliersAPI.delete(supplierId, username);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Supplier has been deleted.',
          timer: 1500
        });
        fetchData();
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

  const handleBack = () => {
    navigate(-1);
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      paid: 'success',
      pending: 'warning',
      overdue: 'danger',
      partial: 'info'
    };
    return colors[status] || 'secondary';
  };

  // Clear purchase search
  const clearPurchaseSearch = () => {
    setPurchaseSearchTerm('');
  };

  return (
    <div className="suppliers-container">
      {/* Header with back button */}
      <div className="header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <h1>Suppliers Management</h1>
        </div>
        <button className="logout-btn-small" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>

      {/* Tabs - Removed Price Comparison */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <i className="fas fa-truck"></i> Suppliers
        </button>
        <button 
          className={`tab ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
        >
          <i className="fas fa-shopping-cart"></i> Purchase History
        </button>
        <button 
          className={`tab ${activeTab === 'add-supplier' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-supplier')}
        >
          <i className="fas fa-plus-circle"></i> Add Supplier
        </button>
        <button 
          className={`tab ${activeTab === 'add-purchase' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-purchase')}
        >
          <i className="fas fa-cart-plus"></i> Record Purchase
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading data...</div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <i className="fas fa-truck"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalSuppliers}</div>
                <div className="stat-label">Total Suppliers</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purchases">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalPurchases}</div>
                <div className="stat-label">Total Purchases</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon spent">
                <i className="fas fa-money-bill-wave"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  ₱{stats.totalSpent.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="stat-label">Total Spent</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon average">
                <i className="fas fa-calculator"></i>
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  ₱{stats.averageOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
                <div className="stat-label">Avg Order Value</div>
              </div>
            </div>
          </div>

          {/* Suppliers Tab */}
          {activeTab === 'suppliers' && (
            <div className="suppliers-list-section">
              <h3><i className="fas fa-truck"></i> All Suppliers</h3>
              <div className="table-container">
                <table className="suppliers-table">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Contact Person</th>
                      <th>Contact Info</th>
                      <th>Payment Terms</th>
                      <th>Products</th>
                      <th>Total Purchases</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.length > 0 ? (
                      suppliers.map(supplier => {
                        const supplierPurchases = purchases.filter(p => p.supplier_id === supplier._id);
                        const totalSpent = supplierPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
                        
                        return (
                          <tr key={supplier._id}>
                            <td><strong>{supplier.company_name}</strong></td>
                            <td>{supplier.contact_person || 'N/A'}</td>
                            <td>
                              <div><i className="fas fa-envelope"></i> {supplier.email}</div>
                              <div><i className="fas fa-phone"></i> {supplier.phone}</div>
                            </td>
                            <td>
                              <span className="payment-term-badge">
                                {supplier.payment_terms?.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {supplier.products && supplier.products.length > 0 ? (
                                <div className="product-tags">
                                  {supplier.products.slice(0, 2).map((p, i) => (
                                    <span key={i} className="product-tag">{p}</span>
                                  ))}
                                  {supplier.products.length > 2 && (
                                    <span className="product-tag more">+{supplier.products.length - 2}</span>
                                  )}
                                </div>
                              ) : 'No products listed'}
                            </td>
                            <td>
                              <div className="purchase-stats">
                                <span className="purchase-count">{supplierPurchases.length} orders</span>
                                <span className="purchase-total">₱{totalSpent.toLocaleString()}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge status-${supplier.status}`}>
                                {supplier.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="action-btn view-btn"
                                  onClick={() => handleViewSupplierDetails(supplier._id)}
                                  title="View Details"
                                >
                                  <i className="fas fa-eye"></i> View
                                </button>
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={() => handleEditSupplier(supplier._id)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i> Edit
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteSupplier(supplier._id, supplier.company_name)}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash"></i> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">
                          <div className="empty-state">
                            <div className="empty-icon">🚚</div>
                            <p>No suppliers found</p>
                            <button 
                              className="btn btn-primary"
                              onClick={() => setActiveTab('add-supplier')}
                            >
                              <i className="fas fa-plus"></i> Add Your First Supplier
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier Details Modal */}
          {showSupplierDetails && selectedSupplier && (
            <div className="modal-overlay" onClick={closeSupplierDetails}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Supplier Details: {selectedSupplier.supplier?.company_name}</h3>
                  <button className="modal-close" onClick={closeSupplierDetails}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="modal-body">
                  <div className="details-grid">
                    <div className="detail-group">
                      <label>Company Name:</label>
                      <p>{selectedSupplier.supplier?.company_name}</p>
                    </div>
                    <div className="detail-group">
                      <label>Contact Person:</label>
                      <p>{selectedSupplier.supplier?.contact_person || 'N/A'}</p>
                    </div>
                    <div className="detail-group">
                      <label>Email:</label>
                      <p>{selectedSupplier.supplier?.email}</p>
                    </div>
                    <div className="detail-group">
                      <label>Phone:</label>
                      <p>{selectedSupplier.supplier?.phone}</p>
                    </div>
                    <div className="detail-group full-width">
                      <label>Address:</label>
                      <p>{selectedSupplier.supplier?.address || 'N/A'}</p>
                    </div>
                    <div className="detail-group">
                      <label>Payment Terms:</label>
                      <p>{selectedSupplier.supplier?.payment_terms?.toUpperCase()}</p>
                    </div>
                    <div className="detail-group">
                      <label>Status:</label>
                      <p className={`status-badge status-${selectedSupplier.supplier?.status}`}>
                        {selectedSupplier.supplier?.status}
                      </p>
                    </div>
                    <div className="detail-group full-width">
                      <label>Products:</label>
                      <div className="product-tags">
                        {selectedSupplier.supplier?.products?.map((p, i) => (
                          <span key={i} className="product-tag">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h4>Purchase Statistics</h4>
                  <div className="stats-grid-small">
                    <div className="stat-card">
                      <div className="stat-icon">📊</div>
                      <div className="stat-value">{selectedSupplier.stats?.total_purchases || 0}</div>
                      <div className="stat-label">Total Purchases</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">💰</div>
                      <div className="stat-value">₱{(selectedSupplier.stats?.total_spent || 0).toLocaleString()}</div>
                      <div className="stat-label">Total Spent</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">📈</div>
                      <div className="stat-value">₱{(selectedSupplier.stats?.average_order_value || 0).toLocaleString()}</div>
                      <div className="stat-label">Average Order</div>
                    </div>
                  </div>

                  <h4>Recent Purchases</h4>
                  <div className="table-container">
                    <table className="purchases-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Material</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Invoice #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSupplier.purchases?.slice(0, 5).map(purchase => (
                          <tr key={purchase._id}>
                            <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                            <td>{purchase.material_id?.material_name}</td>
                            <td>{purchase.quantity} {purchase.material_id?.unit}</td>
                            <td>₱{purchase.unit_price?.toFixed(2)}</td>
                            <td>₱{purchase.total_amount?.toLocaleString()}</td>
                            <td>{purchase.invoice_number || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" onClick={closeSupplierDetails}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Purchases Tab with Search */}
          {activeTab === 'purchases' && (
            <div className="purchases-section">
              <h3><i className="fas fa-history"></i> Purchase History</h3>
              
              {/* Search Bar for Purchases */}
              <div className="search-bar-container" style={{ marginBottom: '20px' }}>
                <div className="search-box" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}></i>
                    <input
                      type="text"
                      placeholder="Search by supplier, material, or invoice number..."
                      value={purchaseSearchTerm}
                      onChange={(e) => setPurchaseSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 15px 12px 40px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                  {purchaseSearchTerm && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={clearPurchaseSearch}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <i className="fas fa-times"></i> Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container">
                <table className="purchases-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total Amount</th>
                      <th>Invoice #</th>
                      <th>Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPurchases.length > 0 ? (
                      filteredPurchases.map(purchase => (
                        <tr key={purchase._id}>
                          <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                          <td><strong>{purchase.supplier_name}</strong></td>
                          <td>{purchase.material_name}</td>
                          <td>{purchase.quantity} {purchase.unit}</td>
                          <td>₱{Number(purchase.unit_price).toFixed(2)}</td>
                          <td className="total-amount">₱{Number(purchase.total_amount).toLocaleString()}</td>
                          <td>{purchase.invoice_number || 'N/A'}</td>
                          <td>
                            <span className={`payment-status status-${getPaymentStatusColor(purchase.payment_status)}`}>
                              {purchase.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="text-center">
                          <div className="empty-state">
                            <div className="empty-icon">📦</div>
                            <p>
                              {purchaseSearchTerm 
                                ? 'No purchases match your search criteria' 
                                : 'No purchase records found'}
                            </p>
                            {purchaseSearchTerm && (
                              <button 
                                className="btn btn-secondary" 
                                onClick={clearPurchaseSearch}
                              >
                                <i className="fas fa-times"></i> Clear Search
                              </button>
                            )}
                            {!purchaseSearchTerm && (
                              <button 
                                className="btn btn-primary"
                                onClick={() => setActiveTab('add-purchase')}
                              >
                                <i className="fas fa-plus"></i> Record Your First Purchase
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Supplier Tab */}
          {activeTab === 'add-supplier' && (
            <div className="add-supplier-section">
              <h3><i className="fas fa-plus-circle"></i> Add New Supplier</h3>
              <form onSubmit={handleAddSupplier} className="supplier-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Company Name</label>
                    <input
                      type="text"
                      name="company_name"
                      value={supplierForm.company_name}
                      onChange={handleSupplierInputChange}
                      required
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="required">Contact Person</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={supplierForm.contact_person}
                      onChange={handleSupplierInputChange}
                      required
                      placeholder="Full name of contact person"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={supplierForm.email}
                      onChange={handleSupplierInputChange}
                      required
                      placeholder="supplier@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="required">Phone Number</label>
                    <div className="phone-input-container">
                      <div className="country-select-wrapper">
                        <select 
                          name="countryCode"
                          value={supplierForm.countryCode || '+63'} 
                          onChange={handleSupplierInputChange}
                          className="country-select"
                        >
                          {countryCodes.map((country, index) => (
                            <option key={index} value={country.code}>
                              {country.flag} {country.code} {country.country}
                            </option>
                          ))}
                        </select>
                        <span className="selected-flag">
                          {countryCodes.find(c => c.code === (supplierForm.countryCode || '+63'))?.flag || '🇵🇭'}
                        </span>
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        value={supplierForm.phone}
                        onChange={handleSupplierInputChange}
                        required
                        placeholder="9123456789 (numbers only)"
                        className="phone-input"
                      />
                    </div>
                    <small className="help-text">Example: 9123456789 (for Philippines)</small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="required">Complete Address</label>
                  <textarea
                    name="address"
                    value={supplierForm.address}
                    onChange={handleSupplierInputChange}
                    required
                    rows="2"
                    placeholder="Street, City, Province, Postal Code"
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Payment Terms</label>
                    <select name="payment_terms" value={supplierForm.payment_terms} onChange={handleSupplierInputChange} required>
                      {paymentTerms.map(term => (
                        <option key={term.value} value={term.value}>{term.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="required">Status</label>
                    <select name="status" value={supplierForm.status} onChange={handleSupplierInputChange} required>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Products/Services Section */}
                <div className="form-group">
                  <label>Products/Services</label>
                  <div className="products-input-container">
                    <input
                      type="text"
                      id="products-input"
                      value={supplierForm.productsInput || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.endsWith(',')) {
                          const newProduct = value.slice(0, -1).trim();
                          if (newProduct) {
                            setSupplierForm(prev => ({
                              ...prev,
                              products: [...prev.products, newProduct],
                              productsInput: ''
                            }));
                          } else {
                            setSupplierForm(prev => ({
                              ...prev,
                              productsInput: ''
                            }));
                          }
                        } else {
                          setSupplierForm(prev => ({
                            ...prev,
                            productsInput: value
                          }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const input = e.target;
                          const value = input.value.trim();
                          if (value) {
                            setSupplierForm(prev => ({
                              ...prev,
                              products: [...prev.products, value],
                              productsInput: ''
                            }));
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value.trim();
                        if (value) {
                          setSupplierForm(prev => ({
                            ...prev,
                            products: [...prev.products, value],
                            productsInput: ''
                          }));
                        }
                      }}
                      placeholder="Type a product and press comma or Enter"
                      className="products-input"
                    />
                    <button
                      type="button"
                      className="btn-add-product"
                      onClick={() => {
                        const input = document.getElementById('products-input');
                        const value = input.value.trim();
                        if (value) {
                          setSupplierForm(prev => ({
                            ...prev,
                            products: [...prev.products, value],
                            productsInput: ''
                          }));
                        }
                      }}
                    >
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                  <small className="help-text">
                    <i className="fas fa-info-circle"></i> Type a product and press comma (,) or Enter to add it.
                  </small>

                  {/* Preview of entered products */}
                  {supplierForm.products && supplierForm.products.length > 0 && (
                    <div className="products-preview">
                      <label>Added Products:</label>
                      <div className="product-tags">
                        {supplierForm.products.map((product, index) => (
                          <span key={index} className="product-tag">
                            {product}
                            <button
                              type="button"
                              className="remove-product"
                              onClick={() => {
                                const newProducts = supplierForm.products.filter((_, i) => i !== index);
                                setSupplierForm(prev => ({ ...prev, products: newProducts }));
                              }}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={supplierForm.notes}
                    onChange={handleSupplierInputChange}
                    rows="3"
                    placeholder="Additional notes about the supplier"
                  ></textarea>
                </div>

                <div className="btn-group">
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save"></i> Add Supplier
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('suppliers')}>
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Purchase Tab */}
          {activeTab === 'add-purchase' && (
            <div className="add-purchase-section">
              <h3><i className="fas fa-cart-plus"></i> Record Purchase</h3>
              <form onSubmit={handleAddPurchase} className="purchase-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Supplier</label>
                    <select name="supplier_id" value={purchaseForm.supplier_id} onChange={handlePurchaseInputChange} required>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s._id} value={s._id}>{s.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="required">Material</label>
                    <select name="material_id" value={purchaseForm.material_id} onChange={handlePurchaseInputChange} required>
                      <option value="">Select Material</option>
                      {materials.length > 0 ? (
                        materials.map(m => (
                          <option key={m._id} value={m._id}>
                            {m.material_name} (₱{m.unit_price} per {m.unit})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No materials available. Please add materials first.</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Quantity</label>
                    <input
                      type="number"
                      name="quantity"
                      value={purchaseForm.quantity}
                      onChange={handlePurchaseInputChange}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label className="required">Unit Price (₱)</label>
                    <input
                      type="number"
                      name="unit_price"
                      value={purchaseForm.unit_price}
                      onChange={handlePurchaseInputChange}
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Amount</label>
                    <input
                      type="number"
                      name="total_amount"
                      value={purchaseForm.total_amount}
                      readOnly
                      className="calculated-field"
                    />
                    <small className="help-text">Auto-calculated</small>
                  </div>
                  <div className="form-group">
                    <label className="required">Purchase Date</label>
                    <input
                      type="date"
                      name="purchase_date"
                      value={purchaseForm.purchase_date}
                      onChange={handlePurchaseInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="required">Invoice Number</label>
                    <input
                      type="text"
                      name="invoice_number"
                      value={purchaseForm.invoice_number}
                      onChange={handlePurchaseInputChange}
                      required
                      placeholder="INV-2024-001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="required">Payment Status</label>
                    <select name="payment_status" value={purchaseForm.payment_status} onChange={handlePurchaseInputChange} required>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partial</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={purchaseForm.notes}
                    onChange={handlePurchaseInputChange}
                    rows="3"
                    placeholder="Additional notes about this purchase"
                  ></textarea>
                </div>

                <div className="btn-group">
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save"></i> Record Purchase
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('purchases')}>
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modal Styles */}
      <style jsx="true">{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        
        .modal-content {
          background: white;
          border-radius: 15px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        
        .modal-header h3 {
          margin: 0;
          color: #1e293b;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: #64748b;
          transition: color 0.3s;
        }
        
        .modal-close:hover {
          color: #ef4444;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: right;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        
        .detail-group {
          margin-bottom: 10px;
        }
        
        .detail-group.full-width {
          grid-column: span 2;
        }
        
        .detail-group label {
          font-weight: 600;
          color: #64748b;
          font-size: 0.85rem;
          display: block;
          margin-bottom: 5px;
        }
        
        .detail-group p {
          margin: 0;
          color: #1e293b;
          font-size: 1rem;
          word-break: break-word;
        }
        
        .stats-grid-small {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 20px 0;
        }
        
        @media (max-width: 768px) {
          .details-grid {
            grid-template-columns: 1fr;
          }
          
          .detail-group.full-width {
            grid-column: span 1;
          }
          
          .stats-grid-small {
            grid-template-columns: 1fr;
          }
          
          .modal-content {
            margin: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Suppliers;
// Payments.js - Complete fixed version
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { paymentsAPI, projectsAPI } from './api';
import './Payments.css';

// Format large numbers in compact form (K, M, B)
const formatCompactNumber = (num) => {
  if (num >= 1_000_000_000) return `₱${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `₱${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `₱${(num / 1_000).toFixed(1)}K`;
  return `₱${num.toLocaleString()}`;
};

const Payments = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    averagePayment: 0,
    largestPayment: 0,
    cashPayments: 0,
    bankPayments: 0,
    cardPayments: 0,
    onlinePayments: 0
  });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    amount: '',
    payment_method: 'cash',
    payment_type: 'payment',
    reference_number: '',
    notes: ''
  });

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'gcash', label: 'GCash' },
    { value: 'paymaya', label: 'PayMaya' },
    { value: 'check', label: 'Check' }
  ];

  const paymentTypes = [
    { value: 'down_payment', label: 'Down Payment' },
    { value: 'progress_payment', label: 'Progress Payment' },
    { value: 'final_payment', label: 'Final Payment' },
    { value: 'retention', label: 'Retention' },
    { value: 'payment', label: 'Regular Payment' }
  ];

  // Define calculateStats first since it's used by fetchData
  const calculateStats = (paymentsList) => {
    const totalPayments = paymentsList.length;
    const totalAmount = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
    const largestPayment = paymentsList.reduce((max, p) => Math.max(max, p.amount || 0), 0);
    
    const cashPayments = paymentsList.filter(p => p.payment_method === 'cash').length;
    const bankPayments = paymentsList.filter(p => p.payment_method === 'bank_transfer').length;
    const cardPayments = paymentsList.filter(p => ['credit_card', 'debit_card'].includes(p.payment_method)).length;
    const onlinePayments = paymentsList.filter(p => ['gcash', 'paymaya'].includes(p.payment_method)).length;

    setStats({
      totalPayments,
      totalAmount,
      averagePayment,
      largestPayment,
      cashPayments,
      bankPayments,
      cardPayments,
      onlinePayments
    });
  };

  // Define fetchData after calculateStats
  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch client's projects
      const projectsData = await projectsAPI.getByClient(userId);
      setProjects(projectsData.projects || []);
      
      // Fetch payments for the client
      const paymentsData = await paymentsAPI.getByClient(userId);
      setPayments(paymentsData.payments || []);
      calculateStats(paymentsData.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load payments'
      });
    } finally {
      setLoading(false);
    }
  };

  // Define filterPayments
  const filterPayments = () => {
    let filtered = [...payments];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply payment method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === methodFilter);
    }
    
    // Apply date range filter
    if (dateRange.start) {
      filtered = filtered.filter(payment => 
        new Date(payment.payment_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(payment => 
        new Date(payment.payment_date) <= new Date(dateRange.end)
      );
    }
    
    setFilteredPayments(filtered);
  };

  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array is fine here

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, methodFilter, dateRange]); // Add dependencies

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      amount: '',
      payment_method: 'cash',
      payment_type: 'payment',
      reference_number: '',
      notes: ''
    });
    setShowForm(false);
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    
    // Validation
    if (parseFloat(formData.amount) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Payment amount must be greater than 0'
      });
      return;
    }

    try {
      await paymentsAPI.create({
        ...formData,
        client_id: localStorage.getItem('userId'),
        payment_date: new Date().toISOString()
      }, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Payment recorded successfully!',
        timer: 1500
      });
      
      resetForm();
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to record payment'
      });
    }
  };

  const handleViewReceipt = (payment) => {
    Swal.fire({
      title: 'Payment Receipt',
      html: `
        <div style="text-align: left;">
          <div style="border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b;">Payment Receipt</h3>
            <p style="color: #64748b;">Date: ${new Date(payment.payment_date).toLocaleString()}</p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p><strong>Project:</strong> ${payment.project_name}</p>
            <p><strong>Amount:</strong> ₱${payment.amount.toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${payment.payment_method}</p>
            ${payment.reference_number ? `<p><strong>Reference #:</strong> ${payment.reference_number}</p>` : ''}
            ${payment.notes ? `<p><strong>Notes:</strong> ${payment.notes}</p>` : ''}
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
            <i class="fas fa-check-circle" style="color: #10b981; font-size: 3rem; margin-bottom: 10px;"></i>
            <p style="color: #10b981; font-weight: 600;">Payment Complete</p>
          </div>
        </div>
      `,
      width: '500px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#667eea'
    });
  };

  const handleDownloadReceipt = (payment) => {
    const content = `
      ARCREATE CONSTRUCTION
      PAYMENT RECEIPT
      ====================
      
      Date: ${new Date(payment.payment_date).toLocaleString()}
      
      Project: ${payment.project_name}
      Amount: ₱${payment.amount.toLocaleString()}
      Payment Method: ${payment.payment_method}
      ${payment.reference_number ? `Reference: ${payment.reference_number}` : ''}
      
      Status: PAID
      
      Thank you for your payment!
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-receipt-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Download Started',
      text: 'Receipt has been downloaded.',
      timer: 1500
    });
  };

  const getMethodIcon = (method) => {
    const icons = {
      cash: 'fa-money-bill-wave',
      bank_transfer: 'fa-university',
      credit_card: 'fa-credit-card',
      debit_card: 'fa-credit-card',
      gcash: 'fa-mobile-alt',
      paymaya: 'fa-mobile-alt',
      check: 'fa-money-check'
    };
    return icons[method] || 'fa-credit-card';
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

  return (
    <div className="payments-container">
      <div className="payments-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-credit-card"></i>
            </div>
            <div>
              <h1>Payments</h1>
              <p className="header-subtitle">Track and manage your payments</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Action Buttons */}
        <div className="action-bar">
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <i className={`fas fa-${showForm ? 'times' : 'plus'}`}></i>
            {showForm ? 'Cancel' : 'Make New Payment'}
          </button>
        </div>

        {/* Payment Form */}
        {showForm && (
          <div className="payment-form-section">
            <h3><i className="fas fa-money-bill-wave"></i> Make a Payment</h3>
            <form onSubmit={handleMakePayment} className="payment-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Project</label>
                  <select name="project_id" value={formData.project_id} onChange={handleInputChange} required>
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_name} - ₱{project.balance?.toLocaleString()} balance
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="required">Amount (₱)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Payment Method</label>
                  <select name="payment_method" value={formData.payment_method} onChange={handleInputChange} required>
                    {paymentMethods.map(method => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="required">Payment Type</label>
                  <select name="payment_type" value={formData.payment_type} onChange={handleInputChange} required>
                    {paymentTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Reference Number</label>
                  <input
                    type="text"
                    name="reference_number"
                    value={formData.reference_number}
                    onChange={handleInputChange}
                    placeholder="Transaction reference"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-check"></i> Submit Payment
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  <i className="fas fa-times"></i> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-credit-card"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalPayments}</div>
              <div className="stat-label">Total Payments</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon amount">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCompactNumber(stats.totalAmount)}</div>
              <div className="stat-label">Total Amount</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon average">
              <i className="fas fa-calculator"></i>
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCompactNumber(stats.averagePayment)}</div>
              <div className="stat-label">Average Payment</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon largest">
              <i className="fas fa-arrow-up"></i> {/* Icon added here */}
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatCompactNumber(stats.largestPayment)}</div>
              <div className="stat-label">Largest Payment</div>
            </div>
          </div>
        </div>

        {/* Payment Methods Summary */}
        <div className="methods-summary">
          <h4><i className="fas fa-chart-pie"></i> Payment Methods</h4>
          <div className="method-bars">
            <div className="method-bar-item">
              <div className="method-label">
                <span><i className="fas fa-money-bill-wave"></i> Cash</span>
                <span>{stats.cashPayments}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill cash-bar" 
                  style={{ width: `${stats.totalPayments > 0 ? (stats.cashPayments / stats.totalPayments) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="method-bar-item">
              <div className="method-label">
                <span><i className="fas fa-university"></i> Bank Transfer</span>
                <span>{stats.bankPayments}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill bank-bar" 
                  style={{ width: `${stats.totalPayments > 0 ? (stats.bankPayments / stats.totalPayments) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="method-bar-item">
              <div className="method-label">
                <span><i className="fas fa-credit-card"></i> Card</span>
                <span>{stats.cardPayments}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill card-bar" 
                  style={{ width: `${stats.totalPayments > 0 ? (stats.cardPayments / stats.totalPayments) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div className="method-bar-item">
              <div className="method-label">
                <span><i className="fas fa-mobile-alt"></i> Online</span>
                <span>{stats.onlinePayments}</span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill online-bar" 
                  style={{ width: `${stats.totalPayments > 0 ? (stats.onlinePayments / stats.totalPayments) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search by project or reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select 
              value={methodFilter} 
              onChange={(e) => setMethodFilter(e.target.value)}
              className="method-filter"
            >
              <option value="all">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>

          <div className="date-range">
            <input
              type="date"
              placeholder="Start Date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="date-input"
            />
            <span>to</span>
            <input
              type="date"
              placeholder="End Date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="date-input"
            />
          </div>

          {(searchTerm || methodFilter !== 'all' || dateRange.start || dateRange.end) && (
            <button 
              className="btn btn-secondary clear-btn"
              onClick={() => {
                setSearchTerm('');
                setMethodFilter('all');
                setDateRange({ start: '', end: '' });
              }}
            >
              <i className="fas fa-times"></i> Clear
            </button>
          )}
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="loading-spinner">Loading payments...</div>
        ) : (
          <div className="payments-list">
            {filteredPayments.length > 0 ? (
              filteredPayments.map(payment => (
                <div key={payment.payment_id} className="payment-card">
                  <div className="payment-header">
                    <div>
                      <h3 className="payment-project">{payment.project_name}</h3>
                      <p className="payment-date">{new Date(payment.payment_date).toLocaleString()}</p>
                    </div>
                    <span className={`payment-status status-${payment.payment_status || 'paid'}`}>
                      {payment.payment_status || 'Paid'}
                    </span>
                  </div>

                  <div className="payment-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <i className={`fas ${getMethodIcon(payment.payment_method)}`}></i>
                        <span>{payment.payment_method?.replace('_', ' ')}</span>
                      </div>
                      {payment.reference_number && (
                        <div className="detail-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Ref: {payment.reference_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="detail-row">
                      <div className="detail-item">
                        <i className="fas fa-tag"></i>
                        <span>{payment.payment_type?.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="amount-section">
                      <span className="amount-label">Amount:</span>
                      <span className="amount-value">₱{payment.amount.toLocaleString()}</span>
                    </div>

                    {payment.notes && (
                      <div className="notes-section">
                        <i className="fas fa-sticky-note"></i>
                        <span>{payment.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="payment-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleViewReceipt(payment)}
                    >
                      <i className="fas fa-receipt"></i> View Receipt
                    </button>
                    <button 
                      className="action-btn download-btn"
                      onClick={() => handleDownloadReceipt(payment)}
                    >
                      <i className="fas fa-download"></i> Download
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-credit-card"></i>
                </div>
                <h3>No Payments Found</h3>
                <p>
                  {searchTerm || methodFilter !== 'all' || dateRange.start || dateRange.end
                    ? 'No payments match your search criteria.'
                    : 'You haven\'t made any payments yet.'}
                </p>
                {!showForm && (
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus"></i> Make Your First Payment
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

export default Payments;
// Invoices.js - Complete working version with correct labels
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { paymentsAPI, projectsAPI } from './api';
import './Invoices.css';

// Simple number formatter - clean numbers without decimals
const formatCompactNumber = (value) => {
  if (value === undefined || value === null) return '0';
  
  const num = Number(value);
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000_000) {
    return `${Math.round(num / 1_000_000_000)}B`;
  }
  if (num >= 1_000_000) {
    return `${Math.round(num / 1_000_000)}M`;
  }
  if (num >= 1_000) {
    return `${Math.round(num / 1_000)}K`;
  }
  return num.toLocaleString();
};

const Invoices = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [stats, setStats] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch client's projects
      const projectsData = await projectsAPI.getByClient(userId);
      setProjects(projectsData.projects || []);
      
      // Fetch invoices/payments for the client
      const paymentsData = await paymentsAPI.getByClient(userId);
      const formattedInvoices = formatInvoices(paymentsData.payments || []);
      setInvoices(formattedInvoices);
      calculateStats(formattedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load invoices'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const filterInvoices = useCallback(() => {
    let filtered = [...invoices];
    
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.payment_date) >= new Date(dateRange.start)
      );
    }
    if (dateRange.end) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.payment_date) <= new Date(dateRange.end)
      );
    }
    
    setFilteredInvoices(filtered);
  }, [invoices, searchTerm, statusFilter, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    filterInvoices();
  }, [filterInvoices]);

  const formatInvoices = (payments) => {
    return payments.map((payment, index) => ({
      invoice_id: payment.payment_id || payment._id,
      invoice_number: generateInvoiceNumber(payment, index),
      project_id: payment.project_id,
      project_name: payment.project_name || 'Unknown Project',
      amount: payment.amount || 0,
      payment_date: payment.payment_date,
      due_date: calculateDueDate(payment.payment_date),
      status: payment.payment_status || determineStatus(payment),
      payment_method: payment.payment_method || 'Not specified',
      payment_type: payment.payment_type || 'payment',
      description: payment.description || payment.notes || '',
      reference_number: payment.reference_number || ''
    }));
  };

  const generateInvoiceNumber = (payment, index) => {
    const date = new Date(payment.payment_date || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const sequence = String(index + 1).padStart(4, '0');
    return `INV-${year}${month}${day}-${sequence}`;
  };

  const calculateDueDate = (paymentDate) => {
    if (!paymentDate) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const date = new Date(paymentDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString();
  };

  const determineStatus = (payment) => {
    if (payment.payment_status) return payment.payment_status;
    if (!payment.payment_date) return 'pending';
    
    const dueDate = calculateDueDate(payment.payment_date);
    if (new Date() > new Date(dueDate)) return 'overdue';
    return 'pending';
  };

  const calculateStats = (invoicesList) => {
    const totalInvoices = invoicesList.length;
    const paidInvoices = invoicesList.filter(i => i.status === 'paid').length;
    const pendingInvoices = invoicesList.filter(i => i.status === 'pending').length;
    const overdueInvoices = invoicesList.filter(i => i.status === 'overdue').length;
    const totalAmount = invoicesList.reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = invoicesList.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
    const pendingAmount = invoicesList.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0);

    setStats({
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      totalAmount,
      paidAmount,
      pendingAmount
    });
  };

  const handleViewInvoice = (invoice) => {
    Swal.fire({
      title: `Invoice ${invoice.invoice_number}`,
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto;">
          <div style="border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 15px;">
            <h3 style="color: #1e293b; margin-bottom: 5px;">${invoice.project_name}</h3>
            <p style="color: #64748b;">Invoice #: ${invoice.invoice_number}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <p style="font-weight: 600; color: #4b5563; margin-bottom: 5px;">Issue Date</p>
              <p>${new Date(invoice.payment_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p style="font-weight: 600; color: #4b5563; margin-bottom: 5px;">Due Date</p>
              <p>${new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-weight: 600;">Amount:</span>
              <span style="font-size: 1.2rem; font-weight: bold; color: #667eea;">₱${invoice.amount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">Status:</span>
              <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; background: ${invoice.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : invoice.status === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${invoice.status === 'paid' ? '#10b981' : invoice.status === 'pending' ? '#f59e0b' : '#ef4444'};">
                ${invoice.status.toUpperCase()}
              </span>
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; color: #4b5563; margin-bottom: 5px;">Payment Method</p>
            <p>${invoice.payment_method}</p>
          </div>
          
          ${invoice.description ? `
            <div>
              <p style="font-weight: 600; color: #4b5563; margin-bottom: 5px;">Description</p>
              <p style="color: #64748b;">${invoice.description}</p>
            </div>
          ` : ''}
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Close',
      confirmButtonColor: '#667eea'
    });
  };

  const handleDownloadInvoice = (invoice) => {
    const content = `
      ARCREATE CONSTRUCTION INVOICE
      ==============================
      
      Invoice Number: ${invoice.invoice_number}
      Date: ${new Date(invoice.payment_date).toLocaleDateString()}
      Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
      
      Project: ${invoice.project_name}
      
      Amount: ₱${invoice.amount.toLocaleString()}
      Status: ${invoice.status}
      Payment Method: ${invoice.payment_method}
      
      Thank you for your business!
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    Swal.fire({
      icon: 'success',
      title: 'Download Started',
      text: 'Invoice has been downloaded.',
      timer: 1500
    });
  };

  const handlePayInvoice = (invoice) => {
    navigate(`/make-payment?project_id=${invoice.project_id}&amount=${invoice.amount}`);
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

  const getStatusColor = (status) => {
    const colors = {
      paid: 'status-paid',
      pending: 'status-pending',
      overdue: 'status-overdue',
      partial: 'status-partial'
    };
    return colors[status] || 'status-pending';
  };

  return (
    <div className="invoices-container">
      <div className="invoices-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-file-invoice"></i>
            </div>
            <div>
              <h1>Invoices & Billing</h1>
              <p className="header-subtitle">View and manage your invoices</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Stats Cards - CORRECTED LABELS */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <i className="fas fa-file-invoice"></i>
            </div>
            <div className="stat-value">{stats.totalInvoices}</div>
            <div className="stat-label">Total Invoices</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon paid">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-value">{stats.paidInvoices}</div>
            <div className="stat-label">Paid</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-value">{stats.pendingInvoices}</div>
            <div className="stat-label">Pending</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon overdue">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-value">{stats.overdueInvoices}</div>
            <div className="stat-label">Overdue</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon amount">
              <i className="fas fa-money-bill-wave"></i>
            </div>
            <div className="stat-value">₱{formatCompactNumber(stats.totalAmount)}</div>
            <div className="stat-label">Total Amount</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon paid-amount">
              <i className="fas fa-wallet"></i>
            </div>
            <div className="stat-value">₱{formatCompactNumber(stats.paidAmount)}</div>
            <div className="stat-label">Paid Amount</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="search-box">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              placeholder="Search by invoice # or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
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

          {(searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
            <button 
              className="clear-btn"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateRange({ start: '', end: '' });
              }}
            >
              <i className="fas fa-times"></i> Clear Filters
            </button>
          )}
        </div>

        {/* Invoices List */}
        {loading ? (
          <div className="loading-spinner">Loading invoices...</div>
        ) : (
          <div className="invoices-list">
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map(invoice => (
                <div key={invoice.invoice_id} className="invoice-card">
                  <div className="invoice-header">
                    <div>
                      <h3 className="invoice-number">{invoice.invoice_number}</h3>
                      <p className="invoice-project">{invoice.project_name}</p>
                    </div>
                    <span className={`invoice-status ${getStatusColor(invoice.status)}`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="invoice-details">
                    <div className="detail-row">
                      <div className="detail-item">
                        <i className="fas fa-calendar"></i>
                        <span>Issued: {new Date(invoice.payment_date).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <i className="fas fa-clock"></i>
                        <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="detail-row">
                      <div className="detail-item">
                        <i className="fas fa-credit-card"></i>
                        <span>Method: {invoice.payment_method}</span>
                      </div>
                      {invoice.reference_number && (
                        <div className="detail-item">
                          <i className="fas fa-hashtag"></i>
                          <span>Ref: {invoice.reference_number}</span>
                        </div>
                      )}
                    </div>

                    <div className="amount-section">
                      <span className="amount-label">Amount:</span>
                      <span className="amount-value">₱{invoice.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="invoice-actions">
                    <button 
                      className="action-btn view-btn"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      <i className="fas fa-eye"></i> View
                    </button>
                    <button 
                      className="action-btn download-btn"
                      onClick={() => handleDownloadInvoice(invoice)}
                    >
                      <i className="fas fa-download"></i> Download
                    </button>
                    {invoice.status !== 'paid' && (
                      <button 
                        className="action-btn pay-btn"
                        onClick={() => handlePayInvoice(invoice)}
                      >
                        <i className="fas fa-credit-card"></i> Pay Now
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fas fa-file-invoice"></i>
                </div>
                <h3>No Invoices Found</h3>
                <p>
                  {searchTerm || statusFilter !== 'all' || dateRange.start || dateRange.end
                    ? 'No invoices match your search criteria.'
                    : 'You don\'t have any invoices yet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
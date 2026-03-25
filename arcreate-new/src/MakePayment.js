// MakePayment.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { paymentsAPI, projectsAPI } from './api';
import './MakePayment.css';

const MakePayment = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromUrl = queryParams.get('project_id');

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    project_id: projectIdFromUrl || '',
    amount: '',
    payment_method: 'cash',
    payment_type: 'payment',
    reference_number: '',
    notes: ''
  });
  const [balance, setBalance] = useState(0);

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

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      const project = projects.find(p => p.project_id === formData.project_id);
      setSelectedProject(project);
      setBalance(project?.balance || 0);
    }
  }, [formData.project_id, projects]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const projectsData = await projectsAPI.getByClient(userId);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load projects'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumberWithCommas = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const handleAmountChange = (e) => {
    let value = e.target.value.replace(/,/g, ''); // Remove existing commas
    if (value === '') {
      setFormData({ ...formData, amount: '' });
      return;
    }
    
    // Only allow numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }
    
    // Format with commas
    const numValue = parseFloat(value) || 0;
    const formattedValue = formatNumberWithCommas(numValue);
    setFormData({ ...formData, amount: formattedValue });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      handleAmountChange(e);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleProjectChange = (e) => {
    const projectId = e.target.value;
    setFormData({ ...formData, project_id: projectId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.project_id) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Project',
        text: 'Please select a project'
      });
      return;
    }

    const amountValue = parseFloat(formData.amount.replace(/,/g, '')) || 0;
    
    if (amountValue <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Amount',
        text: 'Please enter a valid amount greater than 0'
      });
      return;
    }

    // Check if payment exceeds balance
    if (amountValue > balance) {
      Swal.fire({
        icon: 'warning',
        title: 'Payment Exceeds Balance',
        text: `The payment amount (₱${amountValue.toLocaleString()}) exceeds the remaining balance (₱${balance.toLocaleString()})`
      });
      return;
    }

    // NEW REQUIRED FIELD
    if (!formData.reference_number) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Reference Number',
        text: 'Transaction reference number is required'
      });
      return;
    }

    try {
      await paymentsAPI.create({
        ...formData,
        amount: amountValue,
        client_id: localStorage.getItem('userId'),
        payment_date: new Date().toISOString()
      }, username);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Payment recorded successfully!',
        timer: 1500
      }).then(() => {
        navigate('/payments');
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to record payment'
      });
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
    <div className="make-payment-container">
      <div className="make-payment-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-credit-card"></i>
            </div>
            <div>
              <h1>Make a Payment</h1>
              <p className="header-subtitle">Securely process your payment</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-group">
              <label className="required">Select Project</label>
              <select 
                name="project_id" 
                value={formData.project_id} 
                onChange={handleProjectChange}
                required
              >
                <option value="">-- Choose a project --</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name} - Balance: ₱{(project.balance || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {selectedProject && (
              <div className="balance-info">
                <div className="info-item">
                  <span className="info-label">Contract Amount:</span>
                  <span className="info-value">₱{selectedProject.total_contract_amount?.toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Remaining Balance:</span>
                  <span className={`info-value ${balance > 0 ? 'negative' : 'positive'}`}>
                    ₱{balance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="required">Payment Amount</label>
              <div className="amount-input-container">
                <span className="currency-symbol">₱</span>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  placeholder="0.00"
                  className="amount-input"
                />
              </div>
              <small className="help-text">Amount will be formatted automatically (e.g., 1,000,000)</small>
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

            <div className="form-group">
              <label className="required">Transaction Reference Number</label>
              <input
                type="text"
                name="reference_number"
                value={formData.reference_number}
                onChange={handleInputChange}
                required
                placeholder="e.g., GCASH-123456, BPI-2024-001"
              />
              <small className="help-text">Enter the reference number from your payment transaction</small>
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Any additional information about this payment"
              ></textarea>
            </div>

            <div className="btn-group">
              <button type="submit" className="btn btn-primary">
                <i className="fas fa-check"></i> Process Payment
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MakePayment;
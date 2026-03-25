import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI } from './api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    const result = await Swal.fire({
      title: 'Request Password Reset',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 15px; color: #667eea;">
            <i class="fas fa-key"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            <strong>Password Reset Request</strong>
          </p>
          <p style="color: #666; margin-bottom: 20px;">
            Please enter your username and we will notify the system administrator.
          </p>
          <input type="text" id="request-username" class="swal2-input" placeholder="Enter your username">
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Submit Request',
      preConfirm: () => {
        const username = document.getElementById('request-username').value;
        if (!username) {
          Swal.showValidationMessage('Please enter your username');
          return false;
        }
        return { username };
      }
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const data = await authAPI.forgotPasswordRequest(result.value.username);

        Swal.fire({
          icon: 'success',
          title: 'Request Submitted!',
          html: `
            <div style="text-align: center;">
              <p>${data.message}</p>
              <div style="background: #f0f9ff; padding: 15px; border-radius: 10px; margin-top: 15px;">
                <p style="color: #0369a1; font-size: 0.9rem;">
                  <i class="fas fa-info-circle"></i>
                  The administrator has been notified and will contact you shortly.
                </p>
              </div>
            </div>
          `,
          confirmButtonColor: '#667eea'
        });
      } catch (error) {
        console.error('Reset request error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to submit request. Please try again or contact support.'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="logo-section">
          <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          <h1>ArCreate</h1>
        </div>

        <h2><i className="fas fa-key"></i> Reset Password</h2>

        <div className="info-box">
          <h4><i className="fas fa-shield-alt"></i> Need Help?</h4>
          <p>
            For security reasons, password resets require administrator authorization.
            Click the button below to request a password reset. The system administrator
            will generate a new password for you.
          </p>
        </div>

        <div className="request-link">
          <button onClick={handleRequestReset} className="btn-request" disabled={loading}>
            <i className="fas fa-question-circle"></i> {loading ? 'Submitting...' : 'Request Password Reset from Admin'}
          </button>
        </div>

        <div className="back-link">
          <Link to="/login">
            <i className="fas fa-arrow-left"></i> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
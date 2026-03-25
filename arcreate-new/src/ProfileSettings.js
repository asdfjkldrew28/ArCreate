// In ProfileSettings.js, update the header section

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI, usersAPI } from './api';
import './ProfileSettings.css';

const ProfileSettings = ({ username, fullName, userRole, onLogout, onUpdateUser }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    username: username || '',
    full_name: fullName || '',
    email: '',
    countryCode: '+63',
    phoneNumber: '',
    specialties: [],
    specialtiesInput: ''
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
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

  useEffect(() => {
    // Fetch current user data to populate email and phone
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`http://localhost:5000/api/users/${userId}`);
        const data = await response.json();
        if (data.success) {
          const user = data.user;
          // Parse phone into country code and number
          let countryCode = '+63';
          let phoneNumber = user.phone || '';
          const matchingCode = countryCodes.find(cc => phoneNumber.startsWith(cc.code));
          if (matchingCode) {
            countryCode = matchingCode.code;
            phoneNumber = phoneNumber.substring(matchingCode.code.length);
          }
          setProfileData({
            username: user.username,
            full_name: user.full_name,
            email: user.email || '',
            countryCode,
            phoneNumber,
            specialties: Array.isArray(user.specialties) ? user.specialties : [],
            specialtiesInput: ''
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [countryCodes]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    // For full name field, only allow letters, spaces, dots, and hyphens
    if (name === 'full_name') {
      const filteredValue = value.replace(/[^a-zA-Z\s.\-']/g, '');
      setProfileData(prev => ({ ...prev, [name]: filteredValue }));
    }
    // For phone number field, only allow numbers
    else if (name === 'phoneNumber') {
      const filteredValue = value.replace(/[^0-9]/g, '');
      setProfileData(prev => ({ ...prev, [name]: filteredValue }));
    }
    // For email field, convert to lowercase
    else if (name === 'email') {
      setProfileData(prev => ({ ...prev, [name]: value.toLowerCase() }));
    }
    else {
      setProfileData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCountryCodeChange = (e) => {
    setProfileData(prev => ({ ...prev, countryCode: e.target.value }));
  };

  const handleAddSpecialty = () => {
    if (profileData.specialtiesInput.trim()) {
      setProfileData(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtiesInput.trim()],
        specialtiesInput: ''
      }));
    }
  };

  const handleRemoveSpecialty = (index) => {
    setProfileData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index)
    }));
  };

  const handleSpecialtyKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSpecialty();
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Prevent paste on password fields
  const preventPaste = (e) => {
    e.preventDefault();
    Swal.fire({
      icon: 'warning',
      title: 'Action Blocked',
      text: 'Pasting is not allowed in password fields for security reasons.',
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
    return false;
  };

  // Prevent copy/cut on password fields
  const preventCopyCut = (e) => {
    e.preventDefault();
    return false;
  };

  const validateFullName = (name) => {
    if (!name || name.trim() === '') {
      return { isValid: false, message: 'Full name is required' };
    }
    
    // Check if name contains any numbers
    if (/\d/.test(name)) {
      return { isValid: false, message: 'Full name cannot contain numbers' };
    }
    
    // Check if name contains any special characters (allow only letters, spaces, dots, hyphens, and apostrophes)
    if (/[^a-zA-Z\s.\-']/.test(name)) {
      return { isValid: false, message: 'Full name can only contain letters, spaces, dots, and hyphens' };
    }
    
    // Check if name has at least two parts (first and last name)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return { isValid: false, message: 'Please enter full name (first and last name)' };
    }
    
    // Check each part has at least 2 characters
    for (let part of nameParts) {
      if (part.length < 2) {
        return { isValid: false, message: 'Each name part must be at least 2 characters long' };
      }
    }
    
    return { isValid: true };
  };

  const validatePhoneNumber = (countryCode, phoneNumber) => {
    // For foreman role, phone number is required
    if (userRole === 'foreman' && !phoneNumber) {
      return { isValid: false, message: 'Phone number is required' };
    }

    if (!phoneNumber) return { isValid: true }; // Phone is optional for other roles
    
    const phoneDigits = phoneNumber.replace(/[^0-9]/g, '');
    
    const countryRules = {
      '+63': { min: 10, max: 10, name: 'Philippines' },
      '+1': { min: 10, max: 10, name: 'USA/Canada' },
      '+44': { min: 10, max: 10, name: 'UK' },
      '+61': { min: 9, max: 9, name: 'Australia' },
      '+65': { min: 8, max: 8, name: 'Singapore' },
      '+60': { min: 9, max: 10, name: 'Malaysia' },
      '+62': { min: 9, max: 12, name: 'Indonesia' },
      '+86': { min: 11, max: 11, name: 'China' },
      '+81': { min: 10, max: 10, name: 'Japan' },
      '+82': { min: 9, max: 11, name: 'South Korea' },
      '+91': { min: 10, max: 10, name: 'India' }
    };

    const rule = countryRules[countryCode];
    
    if (rule) {
      if (phoneDigits.length < rule.min || phoneDigits.length > rule.max) {
        return {
          isValid: false,
          message: `${rule.name} phone numbers must have ${rule.min}${rule.min === rule.max ? '' : ` to ${rule.max}`} digits after the country code`
        };
      }
    } else {
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        return {
          isValid: false,
          message: 'Phone number must have 7-15 digits'
        };
      }
    }

    return { isValid: true };
  };

  const validateEmail = (email) => {
    if (!email) {
      return { isValid: false, message: 'Email address is required' };
    }
    
    const trimmedEmail = email.trim().toLowerCase();
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      if (!trimmedEmail.includes('@')) {
        return { isValid: false, message: 'Email must include @ symbol (e.g., name@example.com)' };
      }
      if (trimmedEmail.startsWith('@') || trimmedEmail.endsWith('@')) {
        return { isValid: false, message: 'Email must have characters before and after @' };
      }
      if (!trimmedEmail.includes('.')) {
        return { isValid: false, message: 'Email domain must include a dot (e.g., .com, .org)' };
      }
      return { isValid: false, message: 'Please enter a valid email address (e.g., name@example.com)' };
    }
    
    const domainPart = trimmedEmail.split('@')[1];
    if (!domainPart.includes('.')) {
      return { isValid: false, message: 'Email domain must include a dot (e.g., gmail.com, yahoo.com)' };
    }
    
    const tld = domainPart.split('.').pop();
    if (tld.length < 2) {
      return { isValid: false, message: 'Email must have a valid domain extension (e.g., .com, .org, .net)' };
    }
    
    return { isValid: true };
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    // Validate full name
    const nameValidation = validateFullName(profileData.full_name);
    if (!nameValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Full Name',
        text: nameValidation.message
      });
      return;
    }

    // Validate email
    const emailValidation = validateEmail(profileData.email);
    if (!emailValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: emailValidation.message
      });
      return;
    }

    // Validate phone number if provided
    if (profileData.phoneNumber) {
      const phoneValidation = validatePhoneNumber(profileData.countryCode, profileData.phoneNumber);
      if (!phoneValidation.isValid) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Phone Number',
          text: phoneValidation.message
        });
        return;
      }
    }

    setLoading(true);

    // Combine country code and phone number
    const fullPhoneNumber = profileData.phoneNumber ? 
      `${profileData.countryCode}${profileData.phoneNumber}` : '';

    try {
      await usersAPI.updateProfile({
        user_id: localStorage.getItem('userId'),
        username: profileData.username,
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        specialties: profileData.specialties || []
      });

      // Update localStorage and parent state
      localStorage.setItem('username', profileData.username);
      localStorage.setItem('fullName', profileData.full_name.trim());
      if (onUpdateUser) {
        onUpdateUser({
          username: profileData.username,
          full_name: profileData.full_name.trim()
        });
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Profile updated successfully!',
        timer: 1500
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters long'
      });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Mismatch',
        text: 'New password and confirmation do not match'
      });
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword(
        localStorage.getItem('userId'),
        passwordData.current_password,
        passwordData.new_password
      );

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Password changed successfully!',
        timer: 1500
      });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to change password'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Check if user is admin
    if (userRole === 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Cannot Delete Admin Account',
        text: 'Admin accounts cannot be deleted. Please contact the system administrator if you need to deactivate this account.',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    // Show confirmation dialog with username and password
    const { value: formValues } = await Swal.fire({
      title: 'Delete Account',
      html: `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 4rem; margin-bottom: 15px; color: #ef4444;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <p style="font-size: 1.2rem; margin-bottom: 10px; color: #1e293b;">
            <strong>Are you absolutely sure?</strong>
          </p>
          <p style="color: #64748b; margin-bottom: 20px;">
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
          </p>
        </div>
        <div style="text-align: left;">
          <p style="font-weight: 600; margin-bottom: 5px; color: #1e293b;">Username</p>
          <input type="text" id="swal-username" class="swal2-input" placeholder="Enter your username" value="${username}" readonly style="background: #f1f5f9;">
          
          <p style="font-weight: 600; margin-bottom: 5px; color: #1e293b;">Password</p>
          <input type="password" id="swal-password" class="swal2-input" placeholder="Enter your password">
          
          <div class="security-note" style="margin-top: 10px; color: #f59e0b; font-size: 0.85rem;">
            <i class="fas fa-shield-alt"></i> Please enter your password to confirm account deletion
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete My Account',
      cancelButtonText: 'No, Keep My Account',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const enteredUsername = document.getElementById('swal-username').value;
        const enteredPassword = document.getElementById('swal-password').value;
        
        if (!enteredPassword) {
          Swal.showValidationMessage('Please enter your password');
          return false;
        }
        
        return { username: enteredUsername, password: enteredPassword };
      },
      allowOutsideClick: () => !Swal.isLoading()
    });

    if (formValues) {
      setDeleteLoading(true);
      
      try {
        // First verify credentials
        const loginCheck = await authAPI.login(formValues.username, formValues.password);
        
        if (loginCheck.success) {
          // Call API to delete account
          const response = await fetch(`http://localhost:5000/api/users/${localStorage.getItem('userId')}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              username: formValues.username,
              password: formValues.password,
              userRole: userRole
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            await Swal.fire({
              icon: 'success',
              title: 'Account Deleted',
              text: 'Your account has been successfully deleted. We\'re sorry to see you go!',
              confirmButtonColor: '#667eea'
            });
            
            // Clear localStorage and logout
            localStorage.removeItem('token');
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('userRole');
            localStorage.removeItem('username');
            localStorage.removeItem('fullName');
            localStorage.removeItem('userId');
            onLogout();
            navigate('/login');
          } else {
            throw new Error(data.message || 'Failed to delete account');
          }
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Verification Failed',
          text: error.message || 'Invalid username or password. Account deletion cancelled.',
          confirmButtonColor: '#667eea'
        });
      } finally {
        setDeleteLoading(false);
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
    navigate(-1); // Go back to previous page
  };

  const getDashboardLink = () => {
    switch(userRole) {
      case 'admin': return '/dashboard-admin';
      case 'foreman': return '/dashboard-foreman';
      case 'client': return '/client-dashboard';
      default: return '/inventory';
    }
  };

  return (
    <div className="profile-settings-container">
      <div className="profile-settings-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-user-cog"></i>
            </div>
            <div>
              <h1>Profile Settings</h1>
              <p className="header-subtitle">Manage your account information and security</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="profile-sections">
          {/* Profile Information */}
          <div className="profile-section">
            <h3><i className="fas fa-id-card"></i> Profile Information</h3>
            <form onSubmit={handleUpdateProfile} className="profile-form">
              <div className="form-group">
                <label className="required">Username</label>
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="required">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={profileData.full_name}
                  onChange={handleProfileChange}
                  required
                  placeholder="Enter your full name"
                />
                <small className="help-text">Letters, spaces, dots, and hyphens only</small>
              </div>
              <div className="form-group">
                <label className="required">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  required
                  placeholder="name@example.com"
                />
                <small className="help-text">Must include @ and domain (e.g., name@example.com)</small>
              </div>
              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <div className="phone-input-container">
                  <div className="country-select-wrapper">
                    <select 
                      value={profileData.countryCode} 
                      onChange={handleCountryCodeChange}
                      className="country-select"
                    >
                      {countryCodes.map((country, index) => (
                        <option key={index} value={country.code}>
                          {country.flag} {country.code} {country.country}
                        </option>
                      ))}
                    </select>
                    <span className="selected-flag">
                      {countryCodes.find(c => c.code === profileData.countryCode)?.flag || '🇵🇭'}
                    </span>
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={profileData.phoneNumber}
                    onChange={handleProfileChange}
                    placeholder="Phone number (digits only)"
                    className="phone-input"
                  />
                </div>
                <small className="help-text">
                  <i className="fas fa-globe"></i> Select country code and enter phone number
                </small>
              </div>

              {userRole === 'foreman' && (
                <div className="form-group">
                  <label className="required">Specialties/Skills</label>
                  <div className="specialties-input-container">
                    <input
                      type="text"
                      value={profileData.specialtiesInput}
                      onChange={(e) => setProfileData(prev => ({ ...prev, specialtiesInput: e.target.value }))}
                      onKeyDown={handleSpecialtyKeyDown}
                      placeholder="Type a specialty and press comma or Enter"
                      className="specialties-input"
                    />
                    <button
                      type="button"
                      className="btn-add-specialty"
                      onClick={handleAddSpecialty}
                    >
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                  <small className="help-text">
                    <i className="fas fa-info-circle"></i> Add your skills and specialties
                  </small>

                  {profileData.specialties.length > 0 && (
                    <div className="specialties-preview">
                      <label>Your Specialties:</label>
                      <div className="specialty-tags">
                        {profileData.specialties.map((specialty, index) => (
                          <span key={index} className="specialty-tag">
                            {specialty}
                            <button
                              type="button"
                              className="remove-specialty"
                              onClick={() => handleRemoveSpecialty(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <i className="fas fa-save"></i> {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="profile-section">
            <h3><i className="fas fa-lock"></i> Change Password</h3>
            <form onSubmit={handleChangePassword} className="password-form">
              <div className="form-group password-field">
                <label className="required">Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    onPaste={preventPaste}
                    onCopy={preventCopyCut}
                    onCut={preventCopyCut}
                    required
                    placeholder="Enter current password"
                  />
                </div>
                <div className="security-note warning">
                  <i className="fas fa-shield-alt"></i> Pasting is disabled for security
                </div>
              </div>
              <div className="form-group password-field">
                <label className="required">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    onPaste={preventPaste}
                    onCopy={preventCopyCut}
                    onCut={preventCopyCut}
                    required
                    placeholder="Min. 8 characters"
                  />
                </div>
                <div className="security-note">
                  <i className="fas fa-shield-alt"></i> Pasting is disabled for security
                </div>
              </div>
              <div className="form-group password-field">
                <label className="required">Confirm New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    onPaste={preventPaste}
                    onCopy={preventCopyCut}
                    onCut={preventCopyCut}
                    required
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="security-note">
                  <i className="fas fa-shield-alt"></i> Pasting is disabled for security
                </div>
              </div>
              <button type="submit" className="btn btn-warning" disabled={loading}>
                <i className="fas fa-key"></i> {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="delete-account-section">
          <h3><i className="fas fa-exclamation-triangle"></i> Danger Zone</h3>
          <div className="delete-account-card">
            <div className="delete-icon">
              <i className="fas fa-user-slash"></i>
            </div>
            <div className="delete-info">
              <h4>Delete Your Account</h4>
              <p>Once you delete your account, there is no going back. All your data, projects, and information will be permanently removed.</p>
              <div className="delete-warning">
                <i className="fas fa-exclamation-circle"></i>
                <span>This action cannot be undone</span>
              </div>
            </div>
            <button 
              className="btn-delete-account" 
              onClick={handleDeleteAccount}
              disabled={deleteLoading || userRole === 'admin'}
            >
              <i className="fas fa-trash-alt"></i> 
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
          {userRole === 'admin' && (
            <p className="admin-delete-note">
              <i className="fas fa-info-circle"></i> Admin accounts cannot be deleted for security reasons.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
// In ManageUsers.js, update the header section

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI, usersAPI } from './api';
import './ManageUsers.css';

const ManageUsers = ({ username, fullName, onLogout }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [adminInfo, setAdminInfo] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [refreshRequests, setRefreshRequests] = useState(0);
  
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

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    countryCode: '+63',
    phone: '',
    role: '',
    specialties: [],
    specialtiesInput: ''
  });
  
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    countryCode: '+63',
    phoneNumber: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const fetchData = async () => {
    setPageLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const data = await usersAPI.getWithAdmin(userId);
      
      // Fetch pending reset requests
      try {
        const resetData = await authAPI.getPendingResets();
        setResetRequests(resetData.requests || []);
      } catch (resetError) {
        console.log('No pending reset requests or endpoint not available');
        setResetRequests([]);
      }

      setUsers(data.users || []);
      setAdminInfo(data.adminInfo || {});
      
      // Parse phone number into country code and number
      const adminPhone = data.adminInfo?.phone || '';
      let countryCode = '+63';
      let phoneNumber = adminPhone;
      
      const matchingCode = countryCodes.find(cc => adminPhone.startsWith(cc.code));
      if (matchingCode) {
        countryCode = matchingCode.code;
        phoneNumber = adminPhone.substring(matchingCode.code.length);
      }
      
      setProfileData({
        username: data.adminInfo?.username || '',
        full_name: data.adminInfo?.full_name || '',
        email: data.adminInfo?.email || '',
        countryCode: countryCode,
        phoneNumber: phoneNumber
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load user data'
      });
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshRequests]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For full name field, only allow letters, spaces, dots, and hyphens
    if (name === 'full_name') {
      const filteredValue = value.replace(/[^a-zA-Z\s.\-']/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
    }
    // For phone number field, only allow numbers
    else if (name === 'phone') {
      const filteredValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
    }
    // For email field, convert to lowercase
    else if (name === 'email') {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase() }));
    }
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

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

  const handleCountryCodeChange = (e, isProfile = false) => {
    if (isProfile) {
      setProfileData(prev => ({ ...prev, countryCode: e.target.value }));
    } else {
      setFormData(prev => ({ ...prev, countryCode: e.target.value }));
    }
  };

  const handleAddSpecialty = () => {
    if (formData.specialtiesInput.trim()) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, prev.specialtiesInput.trim()],
        specialtiesInput: ''
      }));
    }
  };

  const handleRemoveSpecialty = (index) => {
    setFormData(prev => ({
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
    if (!phoneNumber) return { isValid: true }; // Phone is optional
    
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

  const handleCreateUser = async (e) => {
    e.preventDefault();

    // Validate full name
    const nameValidation = validateFullName(formData.full_name);
    if (!nameValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Full Name',
        text: nameValidation.message
      });
      return;
    }

    if (formData.password.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'Password must be at least 8 characters long'
      });
      return;
    }

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Email',
        text: emailValidation.message
      });
      return;
    }

    // Validate phone number if provided
    if (formData.phone) {
      const phoneValidation = validatePhoneNumber(formData.countryCode, formData.phone);
      if (!phoneValidation.isValid) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Phone Number',
          text: phoneValidation.message
        });
        return;
      }
    }

    // Combine country code and phone number
    const fullPhoneNumber = formData.phone ? 
      `${formData.countryCode}${formData.phone}` : '';

    try {
      await usersAPI.create({
        ...formData,
        full_name: formData.full_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        specialties: formData.specialties || []
      }, username);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User created successfully!',
        timer: 1500
      });
      setFormData({
        username: '',
        password: '',
        full_name: '',
        email: '',
        countryCode: '+63',
        phone: '',
        role: '',
        specialties: [],
        specialtiesInput: ''
      });
      fetchData();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create user'
      });
    }
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

    // Combine country code and phone number
    const fullPhoneNumber = profileData.phoneNumber ? 
      `${profileData.countryCode}${profileData.phoneNumber}` : '';

    try {
      await usersAPI.updateProfile({
        username: profileData.username,
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim().toLowerCase(),
        phone: fullPhoneNumber,
        user_id: localStorage.getItem('userId')
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Profile updated successfully!',
        timer: 1500
      });
      localStorage.setItem('username', profileData.username);
      localStorage.setItem('fullName', profileData.full_name.trim());
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update profile'
      });
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
    }
  };

  const handleResetUserPassword = async (userId, userName, requestId = null) => {
    const result = await Swal.fire({
      title: 'Reset Password?',
      html: `
        <div style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 15px; color: #f59e0b;">
            <i class="fas fa-key"></i>
          </div>
          <p style="font-size: 1.1rem; margin-bottom: 10px;">
            Reset password for:<br>
            <strong>${userName}</strong>?
          </p>
          <p style="color: #666; font-size: 0.9rem;">
            A new 8-character password will be generated.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Reset'
    });

    if (result.isConfirmed) {
      try {
        // Show loading
        Swal.fire({
          title: 'Resetting Password...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const generateSecurePassword = () => {
          const length = 8; // Fixed at 8 characters
          const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let password = '';
          
          // Ensure at least one uppercase, one lowercase, and one number
          password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
          password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
          password += '0123456789'[Math.floor(Math.random() * 10)];
          
          // Fill the remaining 5 characters randomly
          for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
          }
          
          // Shuffle the password to mix the required characters
          return password.split('').sort(() => Math.random() - 0.5).join('');
        };

        const data = await authAPI.resetUserPassword(userId, username);
        
        // If this was from a request, resolve it
        if (requestId) {
          try {
            await authAPI.resolveResetRequest(requestId, localStorage.getItem('userId'), 'resolved');
          } catch (resolveError) {
            console.log('Could not resolve request:', resolveError);
          }
        }

        Swal.fire({
          icon: 'success',
          title: 'Password Reset Successful!',
          html: `
            <div style="text-align: center;">
              <p>New password for <strong>${userName}</strong> is:</p>
              <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 15px 0; border: 2px solid #f59e0b;">
                <p style="font-size: 1.8rem; font-weight: bold; color: #f59e0b; letter-spacing: 3px; font-family: monospace;">
                  ${data.new_password || generateSecurePassword()}
                </p>
              </div>
              <div style="background: #fee2e2; padding: 12px; border-radius: 8px; margin-top: 15px;">
                <p style="color: #ef4444; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; justify-content: center;">
                  <i class="fas fa-exclamation-triangle"></i>
                  Please provide this password to the user securely and ask them to change it immediately after logging in.
                </p>
              </div>
            </div>
          `,
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'Copy Password and Close',
          width: '600px'
        }).then((result) => {
          if (result.isConfirmed) {
            // Copy password to clipboard
            navigator.clipboard.writeText(data.new_password || generateSecurePassword()).then(() => {
              Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: 'Password copied to clipboard',
                timer: 1500,
                showConfirmButton: false
              });
            }).catch(() => {
              // Fallback if clipboard fails
              alert('New password: ' + (data.new_password || generateSecurePassword()));
            });
          }
        });
        
        // Refresh data
        setRefreshRequests(prev => prev + 1);
      } catch (error) {
        console.error('Reset password error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to reset password. Please check server connection.'
        });
      }
    }
  };

  const handleDismissRequest = async (requestId) => {
    const result = await Swal.fire({
      title: 'Dismiss Request?',
      text: 'Are you sure you want to dismiss this password reset request?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6b7280',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Dismiss'
    });

    if (result.isConfirmed) {
      try {
        await authAPI.resolveResetRequest(requestId, localStorage.getItem('userId'), 'dismissed');
        Swal.fire({
          icon: 'success',
          title: 'Dismissed',
          text: 'Password reset request has been dismissed.',
          timer: 1500
        });
        setRefreshRequests(prev => prev + 1);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to dismiss request'
        });
      }
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
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

  // Function to display formatted phone number
  const formatPhoneForDisplay = (phone) => {
    if (!phone) return '';
    const matchingCode = countryCodes.find(cc => phone.startsWith(cc.code));
    if (matchingCode) {
      const number = phone.substring(matchingCode.code.length);
      return `${matchingCode.code} ${number}`;
    }
    return phone;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="manage-users-container">
      <div className="manage-users-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-users-cog"></i>
            </div>
            <div>
              <h1>User Management</h1>
              <p className="header-subtitle">System administration and user management</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="admin-notice">
          <h4><i className="fas fa-crown"></i> System Administrator Control Panel</h4>
          <p>
            <strong>Current Admin:</strong> {adminInfo.full_name} ({adminInfo.username})
          </p>
          <p className="notice-text">
            <i className="fas fa-info-circle"></i> There is only 1 administrator in the system. You cannot create additional admin accounts.
          </p>
        </div>

        {/* Pending Password Reset Requests - Prominently Displayed */}
        {resetRequests.length > 0 && (
          <div className="reset-requests-section">
            <div className="reset-requests-header">
              <h4>
                <i className="fas fa-exclamation-circle"></i> 
                Pending Password Reset Requests 
                <span className="request-badge">{resetRequests.length}</span>
              </h4>
              <button 
                className="btn-refresh"
                onClick={() => setRefreshRequests(prev => prev + 1)}
                title="Refresh"
              >
                <i className="fas fa-sync-alt"></i>
              </button>
            </div>
            
            <div className="reset-requests-grid">
              {resetRequests.map(request => (
                <div key={request._id} className="reset-request-card">
                  <div className="request-card-header">
                    <div className="request-avatar">
                      {request.full_name?.charAt(0).toUpperCase() || request.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="request-status-badge">
                      <i className="fas fa-clock"></i> Pending
                    </div>
                  </div>
                  
                  <div className="request-card-body">
                    <h5 className="request-name">{request.full_name || request.username}</h5>
                    <p className="request-username">@{request.username}</p>
                    
                    <div className="request-details">
                      {request.email && (
                        <div className="request-detail">
                          <i className="fas fa-envelope"></i>
                          <span>{request.email}</span>
                        </div>
                      )}
                      {request.phone && (
                        <div className="request-detail">
                          <i className="fas fa-phone"></i>
                          <span>{formatPhoneForDisplay(request.phone)}</span>
                        </div>
                      )}
                      <div className="request-detail">
                        <i className="fas fa-clock"></i>
                        <span>Requested: {formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="request-card-footer">
                    <button 
                      className="btn-reset-request"
                      onClick={() => handleResetUserPassword(request.user_id, request.username, request._id)}
                    >
                      <i className="fas fa-key"></i> Reset Password
                    </button>
                    <button 
                      className="btn-dismiss-request"
                      onClick={() => handleDismissRequest(request._id)}
                      title="Dismiss Request"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create New User
          </button>
          <button 
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
          <button 
            className={`tab ${activeTab === 'view' ? 'active' : ''}`}
            onClick={() => setActiveTab('view')}
          >
            View All Users
          </button>
          <button 
            className={`tab ${activeTab === 'reset' ? 'active' : ''}`}
            onClick={() => setActiveTab('reset')}
          >
            Reset Password {resetRequests.length > 0 && `(${resetRequests.length})`}
          </button>
        </div>

        {/* Create User Tab */}
        {activeTab === 'create' && (
          <div className="tab-content">
            <h3>Create New User Account</h3>
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="required">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter unique username"
                  />
                </div>
                <div className="form-group password-field">
                  <label className="required">Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    placeholder="First and Last Name"
                  />
                  <small className="help-text">Letters, spaces, dots, and hyphens only (e.g., Juan Dela Cruz)</small>
                </div>
                <div className="form-group">
                  <label className="required">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="user@example.com"
                  />
                  <small className="help-text">Must include @ and domain (e.g., name@example.com)</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="required">Phone Number</label>
                  <div className="phone-input-container">
                    <div className="country-select-wrapper">
                      <select 
                        value={formData.countryCode} 
                        onChange={(e) => handleCountryCodeChange(e, false)}
                        className="country-select"
                      >
                        {countryCodes.map((country, index) => (
                          <option key={index} value={country.code}>
                            {country.flag} {country.code} {country.country}
                          </option>
                        ))}
                      </select>
                      <span className="selected-flag">
                        {countryCodes.find(c => c.code === formData.countryCode)?.flag || '🇵🇭'}
                      </span>
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="9123456789 (numbers only, no spaces)"
                      className="phone-input"
                    />
                  </div>
                  <small className="help-text">
                    <i className="fas fa-info-circle"></i> Example: 9123456789 (for Philippines)
                  </small>
                </div>
                <div className="form-group">
                  <label className="required">Role</label>
                  <select name="role" value={formData.role} onChange={handleInputChange} required>
                    <option value="">Select Role</option>
                    <option value="foreman">👷 Site Foreman</option>
                    <option value="client">👤 Client</option>
                  </select>
                  <small className="help-text">
                    <i className="fas fa-info-circle"></i> Admin role is not available
                  </small>
                </div>
              </div>

              {formData.role === 'foreman' && (
                <div className="form-group">
                  <label className="required">Specialties/Skills</label>
                  <div className="specialties-input-container">
                    <input
                      type="text"
                      value={formData.specialtiesInput}
                      onChange={(e) => setFormData(prev => ({ ...prev, specialtiesInput: e.target.value }))}
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
                    <i className="fas fa-info-circle"></i> Type a specialty (e.g., "Plumbing", "Electrical") and press comma or Enter to add it.
                  </small>

                  {formData.specialties.length > 0 && (
                    <div className="specialties-preview">
                      <label>Added Specialties:</label>
                      <div className="specialty-tags">
                        {formData.specialties.map((specialty, index) => (
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

              <button type="submit" className="btn btn-success">
                <i className="fas fa-user-plus"></i> Create User Account
              </button>
            </form>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="profile-sections">
              <div className="profile-section">
                <h3>Update My Profile</h3>
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
                      placeholder="Letters only"
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
                      placeholder="user@example.com"
                    />
                    <small className="help-text">Must include @ and domain (e.g., name@example.com)</small>
                  </div>
                  <div className="form-group">
                    <label>Phone Number (International Format)</label>
                    <div className="phone-input-container">
                      <div className="country-select-wrapper">
                        <select 
                          value={profileData.countryCode} 
                          onChange={(e) => handleCountryCodeChange(e, true)}
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
                      <i className="fas fa-globe"></i> Select country code and enter phone number (numbers only)
                    </small>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save"></i> Update Profile
                  </button>
                </form>
              </div>

              <div className="profile-section">
                <h3>Change My Password</h3>
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
                  <button type="submit" className="btn btn-warning">
                    <i className="fas fa-key"></i> Change Password
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Users Tab */}
        {activeTab === 'view' && (
          <div className="tab-content">
            <h3>All System Users</h3>
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(user => (
                      <tr key={user._id}>
                        <td>#{user._id.toString().slice(-6)}</td>
                        <td>
                          <strong>{user.username}</strong>
                          {user._id === localStorage.getItem('userId') && (
                            <span className="you-badge">(You)</span>
                          )}
                        </td>
                        <td>{user.full_name}</td>
                        <td>
                          <span className={`role-badge role-${user.role}`}>
                            {user.role === 'admin' && '👑 Admin'}
                            {user.role === 'foreman' && '👷 Foreman'}
                            {user.role === 'client' && '👤 Client'}
                          </span>
                        </td>
                        <td>{user.email}</td>
                        <td>{formatPhoneForDisplay(user.phone)}</td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge ${user.status}`}>
                            {user.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center">
                        <div className="empty-state">
                          <div className="empty-icon">👥</div>
                          <p>No users found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reset Password Tab */}
        {activeTab === 'reset' && (
          <div className="tab-content">
            <h3>Reset User Password</h3>
            
            {/* Pending Requests Section */}
            {resetRequests.length > 0 && (
              <div className="pending-requests-section">
                <h4>
                  <i className="fas fa-bell"></i> 
                  Pending Reset Requests 
                  <span className="request-count">{resetRequests.length}</span>
                </h4>
                <div className="pending-requests-list">
                  {resetRequests.map(request => (
                    <div key={request._id} className="pending-request-item">
                      <div className="pending-request-info">
                        <div className="pending-request-user">
                          <strong>{request.full_name || request.username}</strong>
                          <span className="pending-request-username">@{request.username}</span>
                        </div>
                        <div className="pending-request-meta">
                          <span><i className="fas fa-clock"></i> {formatDate(request.created_at)}</span>
                          {request.email && (
                            <span><i className="fas fa-envelope"></i> {request.email}</span>
                          )}
                          {request.phone && (
                            <span><i className="fas fa-phone"></i> {formatPhoneForDisplay(request.phone)}</span>
                          )}
                        </div>
                      </div>
                      <div className="pending-request-actions">
                        <button 
                          className="btn-reset-small"
                          onClick={() => handleResetUserPassword(request.user_id, request.username, request._id)}
                        >
                          <i className="fas fa-key"></i> Reset Now
                        </button>
                        <button 
                          className="btn-dismiss-small"
                          onClick={() => handleDismissRequest(request._id)}
                          title="Dismiss"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="help-text">Select a user to reset their password. A new random password will be generated (8-15 characters).</p>
            
            <div className="reset-list">
              {users.filter(u => u._id !== localStorage.getItem('userId')).length > 0 ? (
                users.filter(u => u._id !== localStorage.getItem('userId')).map(user => {
                  const hasPendingRequest = resetRequests.some(r => r.user_id === user._id);
                  return (
                    <div key={user._id} className={`reset-user-item ${hasPendingRequest ? 'has-request' : ''}`}>
                      <div className="user-info">
                        <strong>{user.full_name}</strong>
                        <div className="user-meta">
                          {user.username} • {user.role}
                          {hasPendingRequest && (
                            <span className="pending-badge">
                              <i className="fas fa-exclamation-circle"></i> Reset Requested
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="btn btn-warning"
                        onClick={() => handleResetUserPassword(user._id, user.username)}
                      >
                        <i className="fas fa-key"></i> Reset Password
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <p>No other users to reset</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
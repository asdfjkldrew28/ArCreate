import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { authAPI } from './api';
import './Login.css';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    regUsername: '',
    regPassword: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    countryCode: '+63',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // For full name field, only allow letters, spaces, dots, and hyphens
    if (name === 'fullName') {
      const filteredValue = value.replace(/[^a-zA-Z\s.\-']/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
    }
    // For phone number field, only allow numbers
    else if (name === 'phoneNumber') {
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

  const handleCountryCodeChange = (e) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
  };

  // Prevent paste on password fields
  const preventPaste = (e) => {
    e.preventDefault();
    Swal.fire({
      icon: 'warning',
      title: 'Action Blocked',
      text: 'Pasting is not allowed in password fields for security reasons.',
      timer: 2000,
      showConfirmButton: false
    });
    return false;
  };

  // Prevent copy/cut on password fields
  const preventCopyCut = (e) => {
    e.preventDefault();
    return false;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleRegPasswordVisibility = () => {
    setShowRegPassword(!showRegPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
      return { isValid: false, message: 'Please enter your full name (first and last name)' };
    }
    
    // Check each part has at least 2 characters
    for (let part of nameParts) {
      if (part.length < 2) {
        return { isValid: false, message: 'Each name part must be at least 2 characters long' };
      }
    }
    
    return { isValid: true };
  };

  const validatePhoneNumber = () => {
    if (!formData.phoneNumber) return { isValid: true }; // Phone is optional
    
    const phoneDigits = formData.phoneNumber.replace(/[^0-9]/g, '');
    
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

    const rule = countryRules[formData.countryCode];
    
    if (rule) {
      if (phoneDigits.length < rule.min || phoneDigits.length > rule.max) {
        return {
          isValid: false,
          message: `${rule.flag || ''} ${rule.name} phone numbers must have ${rule.min}${rule.min === rule.max ? '' : ` to ${rule.max}`} digits after the country code`
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

  const validatePasswords = () => {
    // Check password length - changed from 6 to 8
    if (formData.regPassword.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    
    // Check if passwords match
    if (formData.regPassword !== formData.confirmPassword) {
      return { isValid: false, message: 'Passwords do not match' };
    }
    
    return { isValid: true };
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authAPI.login(formData.username, formData.password);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      } else {
        localStorage.setItem('token', 'authenticated-' + Date.now());
      }
      
      onLogin(data.user);
      
      switch(data.user.role) {
        case 'admin':
          navigate('/dashboard-admin');
          break;
        case 'foreman':
          navigate('/dashboard-foreman');
          break;
        case 'client':
          navigate('/client-dashboard');
          break;
        default:
          navigate('/inventory');
      }

      Swal.fire({
        icon: 'success',
        title: 'Welcome!',
        text: `Logged in as ${data.user.full_name}`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error.message || 'Invalid credentials'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate full name
    const nameValidation = validateFullName(formData.fullName);
    if (!nameValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Full Name',
        text: nameValidation.message
      });
      setLoading(false);
      return;
    }

    // Validate passwords
    const passwordValidation = validatePasswords();
    if (!passwordValidation.isValid) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Error',
        text: passwordValidation.message
      });
      setLoading(false);
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
      setLoading(false);
      return;
    }

    // Validate phone number if provided
    if (formData.phoneNumber) {
      const phoneValidation = validatePhoneNumber();
      if (!phoneValidation.isValid) {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Phone Number',
          text: phoneValidation.message
        });
        setLoading(false);
        return;
      }
    }

    // Combine country code and phone number
    const fullPhoneNumber = formData.phoneNumber ? 
      `${formData.countryCode}${formData.phoneNumber}` : '';

    try {
      await authAPI.register({
        username: formData.regUsername,
        password: formData.regPassword,
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: fullPhoneNumber
      });

      Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: 'Please login with your new account',
        timer: 2000
      });
      setActiveTab('login');
      setFormData({
        ...formData,
        regUsername: '',
        regPassword: '',
        confirmPassword: '',
        fullName: '',
        email: '',
        countryCode: '+63',
        phoneNumber: ''
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  // Get flag for selected country
  const getSelectedFlag = () => {
    const selected = countryCodes.find(c => c.code === formData.countryCode);
    return selected ? selected.flag : '🇵🇭';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo-section">
          <img src="/JMJCreations.jpg" alt="ArCreate Logo" />
          <h1>ArCreate</h1>
          <p>Architecture & Construction Management System</p>
        </div>

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button 
            className={`tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="Enter your username"
              />
            </div>

            <div className="form-group password-field">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onPaste={preventPaste}
                  onCopy={preventCopyCut}
                  onCut={preventCopyCut}
                  required
                  placeholder="Enter your password"
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <div className="security-note">
                <i className="fas fa-shield-alt"></i> Pasting is disabled for security
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign In'}
            </button>

            <div className="forgot-password">
              <button className="forgot-password-link" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="register-form">
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="regUsername"
                value={formData.regUsername}
                onChange={handleInputChange}
                required
                placeholder="Choose a username"
              />
            </div>

            <div className="form-group password-field">
              <label>Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showRegPassword ? "text" : "password"}
                  name="regPassword"
                  value={formData.regPassword}
                  onChange={handleInputChange}
                  onPaste={preventPaste}
                  onCopy={preventCopyCut}
                  onCut={preventCopyCut}
                  required
                  placeholder="At least 8 characters"
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={toggleRegPasswordVisibility}
                  tabIndex="-1"
                >
                  <i className={`fas ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <div className="security-note">
                <i className="fas fa-shield-alt"></i> Pasting is disabled for security
              </div>
            </div>

            <div className="form-group password-field">
              <label>Confirm Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onPaste={preventPaste}
                  onCopy={preventCopyCut}
                  onCut={preventCopyCut}
                  required
                  placeholder="Re-enter your password"
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={toggleConfirmPasswordVisibility}
                  tabIndex="-1"
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
              <div className="security-note">
                <i className="fas fa-shield-alt"></i> Pasting is disabled for security
              </div>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                placeholder="Enter your full name"
              />
              <small className="help-text">Letters, spaces, dots, and hyphens only (e.g., John M. Smith)</small>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="name@example.com"
              />
              <small className="help-text">Must include @ and domain (e.g., name@example.com)</small>
            </div>

            <div className="form-group">
              <label>Phone Number (Optional - International Format)</label>
              <div className="phone-input-container">
                <div className="country-select-wrapper">
                  <select 
                    value={formData.countryCode} 
                    onChange={handleCountryCodeChange}
                    className="country-select"
                  >
                    {countryCodes.map((country, index) => (
                      <option key={index} value={country.code}>
                        {country.flag} {country.code} {country.country}
                      </option>
                    ))}
                  </select>
                  <span className="selected-flag">{getSelectedFlag()}</span>
                </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Phone number"
                  className="phone-input"
                />
              </div>
              <small className="help-text">
                <i className="fas fa-globe"></i> Select country code and enter phone number (numbers only)
              </small>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="powered-by">
          Powered by ArCreate Construction Management System
        </div>
      </div>
    </div>
  );
};

export default Login;
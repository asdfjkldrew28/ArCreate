// EditSupplier.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { suppliersAPI } from './api';
import './EditSupplier.css';

const EditSupplier = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
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

  const paymentTerms = [
    { value: 'net15', label: 'Net 15' },
    { value: 'net30', label: 'Net 30' },
    { value: 'net45', label: 'Net 45' },
    { value: 'net60', label: 'Net 60' },
    { value: 'cod', label: 'Cash on Delivery' },
    { value: 'prepaid', label: 'Prepaid' }
  ];

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const data = await suppliersAPI.getSupplierDetails(id);
      
      // Parse phone number to extract country code
      let countryCode = '+63';
      let phoneNumber = data.supplier.phone || '';
      const matchingCode = countryCodes.find(cc => phoneNumber.startsWith(cc.code));
      if (matchingCode) {
        countryCode = matchingCode.code;
        phoneNumber = phoneNumber.substring(matchingCode.code.length);
      }

      setFormData({
        company_name: data.supplier.company_name || '',
        contact_person: data.supplier.contact_person || '',
        email: data.supplier.email || '',
        phone: phoneNumber,
        address: data.supplier.address || '',
        products: data.supplier.products || [],
        productsInput: '',
        payment_terms: data.supplier.payment_terms || 'net30',
        status: data.supplier.status || 'active',
        notes: data.supplier.notes || '',
        countryCode: countryCode
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to fetch supplier data'
      }).then(() => {
        navigate('/suppliers');
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryCodeChange = (e) => {
    setFormData(prev => ({ ...prev, countryCode: e.target.value }));
  };

  const handleAddProduct = () => {
    if (formData.productsInput.trim()) {
      setFormData(prev => ({
        ...prev,
        products: [...prev.products, prev.productsInput.trim()],
        productsInput: ''
      }));
    }
  };

  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddProduct();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Validation
    if (!formData.contact_person) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Contact Person',
        text: 'Contact person is required'
      });
      setSaving(false);
      return;
    }

    if (!formData.address) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Address',
        text: 'Complete address is required'
      });
      setSaving(false);
      return;
    }

    // Combine country code and phone number
    const fullPhoneNumber = formData.phone ? 
      `${formData.countryCode}${formData.phone}` : '';

    try {
      await suppliersAPI.update(id, {
        ...formData,
        phone: fullPhoneNumber
      }, username);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Supplier updated successfully',
        timer: 1500
      }).then(() => {
        navigate('/suppliers');
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update supplier'
      });
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="edit-supplier-container">
        <div className="loading-spinner">Loading supplier data...</div>
      </div>
    );
  }

  return (
    <div className="edit-supplier-container">
      <div className="edit-supplier-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div className="header-icon">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h1>Edit Supplier</h1>
              <p className="header-subtitle">Update supplier information</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        <div className="supplier-info">
          <div className="info-badge">
            <i className="fas fa-building"></i> Editing: <strong>{formData.company_name}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="supplier-form">
          <div className="form-row">
            <div className="form-group">
              <label className="required">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                required
                placeholder="Enter company name"
              />
            </div>
            <div className="form-group">
              <label className="required">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleInputChange}
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
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="supplier@company.com"
              />
            </div>
            <div className="form-group">
              <label className="required">Phone Number</label>
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
              value={formData.address}
              onChange={handleInputChange}
              required
              rows="2"
              placeholder="Street, City, Province, Postal Code"
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="required">Payment Terms</label>
              <select name="payment_terms" value={formData.payment_terms} onChange={handleInputChange} required>
                {paymentTerms.map(term => (
                  <option key={term.value} value={term.value}>{term.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="required">Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} required>
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
                value={formData.productsInput}
                onChange={(e) => setFormData(prev => ({ ...prev, productsInput: e.target.value }))}
                onKeyDown={handleKeyDown}
                placeholder="Type a product and press comma or Enter"
                className="products-input"
              />
              <button
                type="button"
                className="btn-add-product"
                onClick={handleAddProduct}
              >
                <i className="fas fa-plus"></i> Add
              </button>
            </div>
            <small className="help-text">
              <i className="fas fa-info-circle"></i> Type a product and press comma (,) or Enter to add it.
            </small>
            
            {/* Product Tags */}
            {formData.products.length > 0 && (
              <div className="products-preview">
                <label>Added Products:</label>
                <div className="product-tags">
                  {formData.products.map((product, index) => (
                    <span key={index} className="product-tag">
                      {product}
                      <button
                        type="button"
                        className="remove-product"
                        onClick={() => handleRemoveProduct(index)}
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
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Additional notes about the supplier"
            ></textarea>
          </div>

          <div className="btn-group">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fas fa-save"></i> {saving ? 'Updating...' : 'Update Supplier'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              <i className="fas fa-times"></i> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSupplier;
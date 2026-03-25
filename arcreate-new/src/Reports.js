import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Reports.css';

const API_URL = 'http://localhost:5000/api';

const Reports = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Data states
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [selectedProjectForReports, setSelectedProjectForReports] = useState('all');
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalUsers: 0,
    totalClients: 0,
    totalForemen: 0,
    totalMaterials: 0,
    totalInventoryValue: 0,
    lowStockItems: 0,
    totalSuppliers: 0,
    totalPurchases: 0,
    totalSpent: 0,
    totalPayments: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        projectsRes,
        usersRes,
        materialsRes,
        suppliersRes,
        purchasesRes,
        paymentsRes
      ] = await Promise.all([
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/users/all`),
        fetch(`${API_URL}/materials`),
        fetch(`${API_URL}/suppliers`),
        fetch(`${API_URL}/purchases/all`),
        fetch(`${API_URL}/payments/all`)
      ]);

      const projectsData = await projectsRes.json();
      const usersData = await usersRes.json();
      const materialsData = await materialsRes.json();
      const suppliersData = await suppliersRes.json();
      const purchasesData = await purchasesRes.json();
      const paymentsData = await paymentsRes.json();

      setProjects(projectsData.projects || []);
      setUsers(usersData.users || []);
      setMaterials(materialsData.materials || []);
      setSuppliers(suppliersData.suppliers || []);
      setPurchases(purchasesData.purchases || []);
      setPayments(paymentsData.payments || []);

      // Calculate stats
      calculateStats(
        projectsData.projects || [],
        usersData.users || [],
        materialsData.materials || [],
        suppliersData.suppliers || [],
        purchasesData.purchases || [],
        paymentsData.payments || []
      );

    } catch (error) {
      console.error('Error fetching data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load report data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsList, usersList, materialsList, suppliersList, purchasesList, paymentsList) => {
    // Filter by date range
    const filteredPayments = paymentsList.filter(p => 
      new Date(p.payment_date) >= new Date(dateRange.start) &&
      new Date(p.payment_date) <= new Date(dateRange.end)
    );

    const filteredPurchases = purchasesList.filter(p => 
      new Date(p.purchase_date) >= new Date(dateRange.start) &&
      new Date(p.purchase_date) <= new Date(dateRange.end)
    );

    setStats({
      totalProjects: projectsList.length,
      activeProjects: projectsList.filter(p => ['planning', 'construction', 'finishing'].includes(p.status)).length,
      completedProjects: projectsList.filter(p => p.status === 'completed').length,
      totalUsers: usersList.length,
      totalClients: usersList.filter(u => u.role === 'client').length,
      totalForemen: usersList.filter(u => u.role === 'foreman').length,
      totalMaterials: materialsList.length,
      totalInventoryValue: materialsList.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0),
      lowStockItems: materialsList.filter(m => m.quantity <= m.min_stock_level && m.quantity > 0).length,
      totalSuppliers: suppliersList.length,
      totalPurchases: filteredPurchases.length,
      totalSpent: filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
      totalPayments: filteredPayments.length,
      totalRevenue: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    });
  };

  const fetchDailyReports = async () => {
    try {
      let url = `${API_URL}/reports/all`;
      if (selectedProjectForReports !== 'all') {
        url += `?project_id=${selectedProjectForReports}`;
      }
      if (reportDateRange.start && reportDateRange.end) {
        url += `${selectedProjectForReports !== 'all' ? '&' : '?'}start=${reportDateRange.start}&end=${reportDateRange.end}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      setDailyReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'dailyreports') {
      fetchDailyReports();
    }
  }, [activeTab, selectedProjectForReports, reportDateRange]);

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleExportPDF = () => {
    Swal.fire({
      icon: 'success',
      title: 'Export Started',
      text: 'Your report is being generated. This feature will be available soon.',
      timer: 2000
    });
  };

  const handleExportExcel = () => {
    Swal.fire({
      icon: 'success',
      title: 'Export Started',
      text: 'Your Excel file is being generated. This feature will be available soon.',
      timer: 2000
    });
  };

  const handlePrint = () => {
    window.print();
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-PH').format(value || 0);
  };

  return (
    <div className="reports-container">
      <div className="reports-card">
        <div className="header">
          <div className="header-left">
            <button className="back-btn" onClick={handleBack}>
              <i className="fas fa-arrow-left"></i> Back
            </button>
            <div>
              <h1>Reports & Analytics</h1>
              <p className="header-subtitle">Welcome, {fullName || username}</p>
            </div>
          </div>
          <button className="logout-btn-small" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>

        {/* Date Range and Controls */}
        <div className="report-controls">
          <div className="controls-row">
            <div className="date-range-group">
              <label>Date Range:</label>
              <div className="date-range">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="date-input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="date-input"
                />
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleRefresh}>
                <i className="fas fa-sync-alt"></i> Refresh
              </button>
              <button className="btn btn-success" onClick={handleExportExcel}>
                <i className="fas fa-file-excel"></i> Excel
              </button>
              <button className="btn btn-primary" onClick={handleExportPDF}>
                <i className="fas fa-file-pdf"></i> PDF
              </button>
              <button className="btn btn-secondary" onClick={handlePrint}>
                <i className="fas fa-print"></i> Print
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="reports-tabs">
          <button 
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <i className="fas fa-chart-pie"></i> Summary
          </button>
          <button 
            className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <i className="fas fa-project-diagram"></i> Projects
          </button>
          <button 
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <i className="fas fa-boxes"></i> Inventory
          </button>
          <button 
            className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
            onClick={() => setActiveTab('financial')}
          >
            <i className="fas fa-money-bill-wave"></i> Financial
          </button>
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-users"></i> Users
          </button>
          <button 
            className={`tab ${activeTab === 'dailyreports' ? 'active' : ''}`}
            onClick={() => setActiveTab('dailyreports')}
          >
            <i className="fas fa-clipboard-list"></i> Daily Reports
          </button>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i> Loading reports...
          </div>
        ) : (
          <div className="report-content">
            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="summary-report">
                <h2>Executive Summary</h2>
                <p className="report-period">
                  {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                </p>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon projects">
                      <i className="fas fa-project-diagram"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatNumber(stats.totalProjects)}</div>
                      <div className="stat-label">Total Projects</div>
                      <div className="stat-sub">
                        <span className="active">{stats.activeProjects} Active</span>
                        <span className="completed">{stats.completedProjects} Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon users">
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatNumber(stats.totalUsers)}</div>
                      <div className="stat-label">Total Users</div>
                      <div className="stat-sub">
                        <span className="clients">{stats.totalClients} Clients</span>
                        <span className="foremen">{stats.totalForemen} Foremen</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon inventory">
                      <i className="fas fa-boxes"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatNumber(stats.totalMaterials)}</div>
                      <div className="stat-label">Materials</div>
                      <div className="stat-sub">
                        <span className="warning">{stats.lowStockItems} Low Stock</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon revenue">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
                      <div className="stat-label">Revenue</div>
                      <div className="stat-sub">
                        <span>{stats.totalPayments} Transactions</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon expenses">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatCurrency(stats.totalSpent)}</div>
                      <div className="stat-label">Expenses</div>
                      <div className="stat-sub">
                        <span>{stats.totalPurchases} Purchases</span>
                      </div>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon profit">
                      <i className="fas fa-coins"></i>
                    </div>
                    <div className="stat-details">
                      <div className="stat-value">{formatCurrency(stats.totalRevenue - stats.totalSpent)}</div>
                      <div className="stat-label">Net Profit</div>
                      <div className="stat-sub">
                        <span className={stats.totalRevenue - stats.totalSpent >= 0 ? 'positive' : 'negative'}>
                          {stats.totalRevenue - stats.totalSpent >= 0 ? 'Profit' : 'Loss'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="inventory-value-card">
                  <div className="value-label">Total Inventory Value</div>
                  <div className="value-amount">{formatCurrency(stats.totalInventoryValue)}</div>
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div className="projects-report">
                <h2>Projects Report</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Project Name</th>
                        <th>Client</th>
                        <th>Status</th>
                        <th>Contract Value</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.length > 0 ? (
                        projects.map(project => (
                          <tr key={project.project_id}>
                            <td><strong>{project.project_name}</strong></td>
                            <td>{project.client_name || 'N/A'}</td>
                            <td>
                              <span className={`status-badge status-${project.status}`}>
                                {project.status?.replace('_', ' ') || 'N/A'}
                              </span>
                            </td>
                            <td className="currency">{formatCurrency(project.total_contract_amount)}</td>
                            <td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}</td>
                            <td>{project.estimated_end_date ? new Date(project.estimated_end_date).toLocaleDateString() : 'N/A'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center">No projects found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="inventory-report">
                <h2>Inventory Report</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Unit Price</th>
                        <th>Total Value</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.length > 0 ? (
                        materials.map(material => {
                          const totalValue = material.quantity * material.unit_price;
                          const stockStatus = material.quantity <= 0 ? 'out' : 
                                            material.quantity <= material.min_stock_level ? 'low' : 'normal';
                          
                          return (
                            <tr key={material._id}>
                              <td><strong>{material.material_name}</strong></td>
                              <td>{material.category}</td>
                              <td className={stockStatus === 'low' ? 'warning' : stockStatus === 'out' ? 'danger' : ''}>
                                {material.quantity}
                              </td>
                              <td>{material.unit}</td>
                              <td className="currency">{formatCurrency(material.unit_price)}</td>
                              <td className="currency">{formatCurrency(totalValue)}</td>
                              <td>
                                <span className={`stock-badge ${stockStatus}`}>
                                  {stockStatus === 'out' ? 'Out of Stock' : 
                                   stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center">No materials found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Tab */}
            {activeTab === 'financial' && (
              <div className="financial-report">
                <h2>Financial Report</h2>
                <p className="report-period">
                  {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                </p>

                <div className="financial-summary">
                  <div className="summary-box revenue">
                    <div className="box-icon">
                      <i className="fas fa-arrow-down"></i>
                    </div>
                    <div className="box-content">
                      <div className="box-label">Revenue</div>
                      <div className="box-value">{formatCurrency(stats.totalRevenue)}</div>
                    </div>
                  </div>

                  <div className="summary-box expenses">
                    <div className="box-icon">
                      <i className="fas fa-arrow-up"></i>
                    </div>
                    <div className="box-content">
                      <div className="box-label">Expenses</div>
                      <div className="box-value">{formatCurrency(stats.totalSpent)}</div>
                    </div>
                  </div>

                  <div className="summary-box profit">
                    <div className="box-icon">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div className="box-content">
                      <div className="box-label">Net Profit</div>
                      <div className="box-value">{formatCurrency(stats.totalRevenue - stats.totalSpent)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="users-report">
                <h2>Users Report</h2>
                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map(user => (
                          <tr key={user._id}>
                            <td><strong>{user.username}</strong></td>
                            <td>{user.full_name}</td>
                            <td>
                              <span className={`role-badge role-${user.role}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.phone || 'N/A'}</td>
                            <td>
                              <span className={`status-badge ${user.status}`}>
                                {user.status}
                              </span>
                            </td>
                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center">No users found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Daily Reports Tab */}
            {activeTab === 'dailyreports' && (
              <div className="daily-reports-report">
                <h2>Daily Reports</h2>
                <p className="report-period">
                  All daily construction reports submitted by foremen
                </p>

                <div className="report-filters" style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div className="filter-group" style={{ minWidth: '250px' }}>
                    <label>Project:</label>
                    <select 
                      value={selectedProjectForReports} 
                      onChange={(e) => setSelectedProjectForReports(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
                    >
                      <option value="all">All Projects</option>
                      {projects.map(project => (
                        <option key={project.project_id} value={project.project_id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Date Range:</label>
                    <div className="date-range" style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="date"
                        value={reportDateRange.start}
                        onChange={(e) => setReportDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="date-input"
                        style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
                      />
                      <span>to</span>
                      <input
                        type="date"
                        value={reportDateRange.end}
                        onChange={(e) => setReportDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="date-input"
                        style={{ padding: '10px', borderRadius: '8px', border: '2px solid #e5e7eb' }}
                      />
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={fetchDailyReports} style={{ alignSelf: 'flex-end' }}>
                    <i className="fas fa-sync-alt"></i> Refresh
                  </button>
                </div>

                <div className="table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Project</th>
                        <th>Foreman</th>
                        <th>Work Completed</th>
                        <th>Weather</th>
                        <th>Safety</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReports.length > 0 ? (
                        dailyReports.map(report => (
                          <tr key={report._id}>
                            <td>{new Date(report.report_date).toLocaleDateString()}</td>
                            <td><strong>{report.project_name || 'N/A'}</strong></td>
                            <td>{report.foreman_name || 'Unknown'}</td>
                            <td style={{ maxWidth: '300px' }}>
                              {report.work_completed?.substring(0, 100)}
                              {report.work_completed?.length > 100 ? '...' : ''}
                            </td>
                            <td>
                              <span style={{ textTransform: 'capitalize' }}>{report.weather_conditions}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${report.safety_incidents === 'none' ? 'status-active' : 'status-warning'}`}>
                                {report.safety_incidents === 'none' ? 'Safe' : report.safety_incidents}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="action-btn view-btn"
                                onClick={() => {
                                  Swal.fire({
                                    title: `Daily Report - ${new Date(report.report_date).toLocaleDateString()}`,
                                    html: `
                                      <div style="text-align: left; max-height: 500px; overflow-y: auto;">
                                        <div style="border-bottom: 2px solid #667eea; padding-bottom: 15px; margin-bottom: 15px;">
                                          <h3 style="color: #1e293b;">${report.project_name || 'N/A'}</h3>
                                          <p style="color: #64748b;">Reported by: ${report.foreman_name || 'Unknown'}</p>
                                          <p style="color: #64748b;">Date: ${new Date(report.report_date).toLocaleString()}</p>
                                        </div>

                                        <div style="margin-bottom: 20px;">
                                          <h4 style="color: #1e293b;">📋 Work Completed</h4>
                                          <p>${report.work_completed || 'Not specified'}</p>
                                        </div>

                                        <div style="margin-bottom: 20px;">
                                          <h4 style="color: #1e293b;">📝 Detailed Work Description</h4>
                                          <p>${report.work_description || 'Not provided'}</p>
                                        </div>

                                        <div style="margin-bottom: 20px;">
                                          <h4 style="color: #1e293b;">📅 Work Planned</h4>
                                          <p>${report.work_planned || 'Not specified'}</p>
                                        </div>

                                        <div style="margin-bottom: 20px;">
                                          <h4 style="color: #ef4444;">⚠️ Issues Encountered</h4>
                                          <p>${report.issues_encountered || 'None reported'}</p>
                                        </div>

                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                                          <div>
                                            <h4 style="color: #1e293b;">🧱 Materials Used</h4>
                                            <p>${report.material_used || 'Not specified'}</p>
                                          </div>
                                          <div>
                                            <h4 style="color: #1e293b;">🔧 Equipment Used</h4>
                                            <p>${report.equipment_used || 'Not specified'}</p>
                                          </div>
                                        </div>

                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                                          <div>
                                            <h4 style="color: #1e293b;">👥 Workers Present</h4>
                                            <p>${report.workers_present || 'Not specified'}</p>
                                          </div>
                                          <div>
                                            <h4 style="color: #1e293b;">⏱️ Hours Worked</h4>
                                            <p>${report.hours_worked || 'Not specified'}</p>
                                          </div>
                                        </div>

                                        <div style="margin-bottom: 20px;">
                                          <h4 style="color: #1e293b;">🌤️ Weather Conditions</h4>
                                          <p>${report.weather_conditions}${report.temperature ? ` (${report.temperature}°C)` : ''}</p>
                                        </div>

                                        ${report.supervisor_notes ? `
                                          <div style="margin-bottom: 20px;">
                                            <h4 style="color: #1e293b;">📌 Supervisor Notes</h4>
                                            <p>${report.supervisor_notes}</p>
                                          </div>
                                        ` : ''}
                                      </div>
                                    `,
                                    width: '700px',
                                    confirmButtonText: 'Close',
                                    confirmButtonColor: '#667eea'
                                  });
                                }}
                              >
                                <i className="fas fa-eye"></i> View
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center">
                            <div className="empty-state">
                              <div className="empty-icon">📋</div>
                              <p>No daily reports found</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
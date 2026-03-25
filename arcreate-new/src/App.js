import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './Login';
import DashboardAdmin from './DashboardAdmin';
import DashboardForeman from './DashboardForeman';
import ClientDashboard from './ClientDashboard';
import Inventory from './Inventory';
import AddMaterial from './AddMaterial';
import EditMaterial from './EditMaterial';
import ViewMaterial from './ViewMaterial';
import ViewProject from './ViewProject';
import ManageUsers from './ManageUsers';
import ForgotPassword from './ForgotPassword';
import Suppliers from './Suppliers';
import notificationService from './notificationService';
import ProfileSettings from './ProfileSettings';
import EditSupplier from './EditSupplier';
import Projects from './Projects';
import Invoices from './Invoices';
import Payments from './Payments';
import MakePayment from './MakePayment';
import ProgressUpdates from './ProgressUpdates';
import ProjectTeam from './ProjectTeam';
import Messages from './Messages';
import DailyReports from './DailyReports';
import MaterialRequests from './MaterialRequests';
import Safety from './Safety';
import AdminRequests from './AdminRequests';
import Reports from './Reports';
import ActivityLogs from './ActivityLogs';
import TaskManagement from './TaskManagement';
import Documents from './Documents';
import AdminDocuments from './AdminDocuments';
import Workers from './Workers';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session on app load
    const checkAuth = () => {
      try {
        const storedAuth = localStorage.getItem('isAuthenticated');
        const storedRole = localStorage.getItem('userRole');
        const storedUsername = localStorage.getItem('username');
        const storedFullName = localStorage.getItem('fullName');
        const storedUserId = localStorage.getItem('userId');
        const token = localStorage.getItem('token');

        console.log('Checking auth on refresh:', {
          storedAuth,
          storedRole,
          storedUsername,
          hasToken: !!token
        });

        if (storedAuth === 'true' && storedRole && token) {
          // Restore session from localStorage
          setIsAuthenticated(true);
          setUserRole(storedRole);
          setUsername(storedUsername || '');
          setFullName(storedFullName || '');
          setUserId(storedUserId || null);
        } else {
          // Clear any partial/invalid session
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userRole');
          localStorage.removeItem('username');
          localStorage.removeItem('fullName');
          localStorage.removeItem('userId');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    console.log('Logging in with user data:', userData);
    
    setIsAuthenticated(true);
    setUserRole(userData.role);
    setUsername(userData.username);
    setFullName(userData.full_name);
    setUserId(userData.user_id);
    
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('username', userData.username);
    localStorage.setItem('fullName', userData.full_name);
    localStorage.setItem('userId', userData.user_id);
    
    // Initialize notification service with user ID
    notificationService.setCurrentUser(userData.user_id);
    
    // Sync notifications from backend
    notificationService.syncWithBackend(userData.user_id).then(() => {
      // Add welcome notification (local only, not saved to backend)
      notificationService.addNotification({
        id: `welcome-${Date.now()}`,
        type: 'success',
        title: 'Welcome Back!',
        message: `Welcome to ArCreate, ${userData.full_name || userData.username}`,
        timestamp: new Date().toISOString(),
        link: null,
        persistent: false
      });
    });
    
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    } else {
      localStorage.setItem('token', 'authenticated-' + Date.now());
    }
  };

  const logout = async () => {
    // send logout activity log to server (best-effort)
    try {
      await fetch('http://localhost:5000/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_name: fullName || username,
          user_role: userRole,
          action: 'LOGOUT',
          description: 'User logged out',
          ip_address: null
        })
      });
    } catch (e) {
      console.error('Failed to log logout activity', e);
    }

    // Clear notifications for this user
    notificationService.clearAll();

    setIsAuthenticated(false);
    setUserRole(null);
    setUsername('');
    setFullName('');
    setUserId(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('userId');
  };

  const updateUserInfo = (userData) => {
    setUsername(userData.username);
    setFullName(userData.full_name);
    // Also update localStorage
    localStorage.setItem('username', userData.username);
    localStorage.setItem('fullName', userData.full_name);
  };

  // Get the appropriate dashboard path based on role
  const getDashboardPath = (role) => {
    switch(role) {
      case 'admin': return '/dashboard-admin';
      case 'foreman': return '/dashboard-foreman';
      case 'client': return '/client-dashboard';
      default: return '/inventory';
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
    if (loading) {
      // Show loading while checking authentication
      return (
        <div className="auth-loading-container">
          <div className="auth-loading-content">
            <div className="loading-spinner"></div>
            <p>Restoring your session...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      return <Navigate to="/login" replace />;
    }

    if (requiredRole && userRole !== requiredRole) {
      console.log(`Required role ${requiredRole} but user is ${userRole}, redirecting`);
      return <Navigate to={getDashboardPath(userRole)} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      console.log(`User role ${userRole} not in allowed roles, redirecting`);
      return <Navigate to={getDashboardPath(userRole)} replace />;
    }

    return children;
  };

  if (loading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-content">
          <div className="loading-spinner"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  console.log('App render - auth state:', { isAuthenticated, userRole, username });

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Admin Routes */}
          <Route path="/dashboard-admin" element={
            <ProtectedRoute requiredRole="admin">
              <DashboardAdmin 
                username={username} 
                fullName={fullName} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/manage-users" element={
            <ProtectedRoute requiredRole="admin">
              <ManageUsers 
                username={username} 
                fullName={fullName} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/admin-requests" element={
            <ProtectedRoute requiredRole="admin">
              <AdminRequests 
                username={username} 
                fullName={fullName} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-documents" element={
            <ProtectedRoute requiredRole="admin">
              <AdminDocuments 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/suppliers" element={
            <ProtectedRoute requiredRole="admin">
              <Suppliers 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/edit-supplier/:id" element={
            <ProtectedRoute requiredRole="admin">
              <EditSupplier 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/reports" element={
            <ProtectedRoute requiredRole="admin">
              <Reports 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          <Route path="/activity-logs" element={
            <ProtectedRoute requiredRole="admin">
              <ActivityLogs 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          {/* Foreman Routes */}
          <Route path="/dashboard-foreman" element={
            <ProtectedRoute requiredRole="foreman">
              <DashboardForeman 
                username={username} 
                fullName={fullName} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          {/* Foreman additional screens */}
          <Route path="/daily-reports" element={
            <ProtectedRoute allowedRoles={["foreman"]}>
              <DailyReports 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/material-requests" element={
            <ProtectedRoute allowedRoles={["foreman"]}>
              <MaterialRequests 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/safety" element={
            <ProtectedRoute allowedRoles={["foreman"]}>
              <Safety 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          <Route path="/task-management" element={
            <ProtectedRoute allowedRoles={["foreman"]}>
              <TaskManagement 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/workers" element={
            <ProtectedRoute allowedRoles={["foreman"]}>
              <Workers 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          {/* Client Routes */}
          <Route path="/client-dashboard" element={
            <ProtectedRoute requiredRole="client">
              <ClientDashboard 
                username={username} 
                fullName={fullName} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/invoices" element={
            <ProtectedRoute allowedRoles={['client']}>
              <Invoices 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/payments" element={
            <ProtectedRoute allowedRoles={['client']}>
              <Payments 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/make-payment" element={
            <ProtectedRoute allowedRoles={['client']}>
              <MakePayment 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/progress-updates" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ProgressUpdates 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/project-team" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ProjectTeam 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute allowedRoles={['client']}>
              <Documents 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/messages" element={
            <ProtectedRoute>
              <Messages 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          {/* Shared Routes (accessible by multiple roles) */}
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory 
                username={username} 
                fullName={fullName} 
                userRole={userRole} 
                userId={userId}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/add-material" element={
            <ProtectedRoute allowedRoles={['admin', 'foreman']}>
              <AddMaterial 
                username={username} 
                fullName={fullName} 
                userRole={userRole} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/edit-material/:id" element={
            <ProtectedRoute allowedRoles={['admin', 'foreman']}>
              <EditMaterial 
                username={username} 
                fullName={fullName} 
                userRole={userRole} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/view-material/:id" element={
            <ProtectedRoute>
              <ViewMaterial 
                username={username} 
                fullName={fullName} 
                userRole={userRole} 
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/projects" element={
            <ProtectedRoute>
              <Projects 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/my-projects" element={
            <ProtectedRoute>
              <Projects 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />
          
          <Route path="/view-project/:id" element={
            <ProtectedRoute>
              <ViewProject 
                username={username} 
                fullName={fullName} 
                userRole={userRole}
                onLogout={logout} 
              />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfileSettings 
                username={username}
                fullName={fullName}
                userRole={userRole}
                onLogout={logout}
                onUpdateUser={updateUserInfo}
              />
            </ProtectedRoute>
          } />
          
          {/* Default redirect based on authentication */}
          <Route path="/" element={
            isAuthenticated ? (
              <Navigate to={getDashboardPath(userRole)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
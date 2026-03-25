import { API_BASE_URL } from './config';

// Helper function to handle responses
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Non-JSON response:', text.substring(0, 200));
    throw new Error('Server returned non-JSON response. Check if server is running.');
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  
  return data;
};

// Auth API
export const authAPI = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
  },

  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  forgotPassword: async (username, admin_username, admin_password) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, admin_username, admin_password })
    });
    return handleResponse(response);
  },

  forgotPasswordRequest: async (username) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return handleResponse(response);
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: userId, 
        current_password: currentPassword, 
        new_password: newPassword 
      })
    });
    return handleResponse(response);
  },

  resetUserPassword: async (userId, admin) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-user-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, admin })
    });
    return handleResponse(response);
  },

  getPendingResets: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/pending-resets`);
    return handleResponse(response);
  },

  resolveResetRequest: async (requestId, adminId, status) => {
    const response = await fetch(`${API_BASE_URL}/auth/resolve-reset/${requestId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, status })
    });
    return handleResponse(response);
  }
};

// Materials API
export const materialsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/materials`);
    return handleResponse(response);
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/materials/${id}`);
    return handleResponse(response);
  },

  search: async (searchTerm) => {
    const response = await fetch(`${API_BASE_URL}/materials/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: searchTerm })
    });
    return handleResponse(response);
  },

  create: async (materialData, username, role) => {
    const response = await fetch(`${API_BASE_URL}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...materialData, username, role })
    });
    return handleResponse(response);
  },

  update: async (id, materialData, username, role) => {
    const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...materialData, username, role })
    });
    return handleResponse(response);
  },

  delete: async (id, username, role) => {
    const response = await fetch(`${API_BASE_URL}/materials/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role })
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/materials/stats`);
    return handleResponse(response);
  },

  getLowStock: async () => {
    const response = await fetch(`${API_BASE_URL}/materials/low-stock`);
    return handleResponse(response);
  },

  getByCategory: async () => {
    const response = await fetch(`${API_BASE_URL}/materials/by-category`);
    return handleResponse(response);
  }
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/users`);
    return handleResponse(response);
  },

  getWithAdmin: async (adminId) => {
    const response = await fetch(`${API_BASE_URL}/users/with-admin?admin_id=${adminId}`);
    return handleResponse(response);
  },

  getById: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    return handleResponse(response);
  },

  create: async (userData, createdBy) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, created_by: createdBy })
    });
    return handleResponse(response);
  },

  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/users/stats`);
    return handleResponse(response);
  },

  getPendingResets: async () => {
    const response = await fetch(`${API_BASE_URL}/users/pending-resets`);
    return handleResponse(response);
  }
};

// Dashboard API
export const dashboardAPI = {
  getAdmin: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/admin`);
    return handleResponse(response);
  },

  getForeman: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/foreman/${userId}`);
    return handleResponse(response);
  },

  getClient: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/dashboard/client/${userId}`);
    return handleResponse(response);
  },

  getInventoryStats: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/inventory`);
    return handleResponse(response);
  },

  getSystemHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard/health`);
    return handleResponse(response);
  }
};

// Stock API
export const stockAPI = {
  getStockIn: async (limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/stock/in?limit=${limit}`);
    return handleResponse(response);
  },

  getStockOut: async (limit = 5, foremanId = null) => {
    let url = `${API_BASE_URL}/stock/out?limit=${limit}`;
    if (foremanId) url += `&foremanId=${foremanId}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  getRecentStockOut: async (limit = 5, foremanId = null) => {
    let url = `${API_BASE_URL}/stock/out/recent?limit=${limit}`;
    if (foremanId) url += `&foremanId=${foremanId}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  createStockIn: async (stockData, username) => {
    const response = await fetch(`${API_BASE_URL}/stock/in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stockData, username })
    });
    return handleResponse(response);
  },

  createStockOut: async (stockData, username) => {
    const response = await fetch(`${API_BASE_URL}/stock/out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stockData, username })
    });
    return handleResponse(response);
  }
};

// Projects API
export const projectsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    return handleResponse(response);
  },

  getByClient: async (clientId) => {
    const response = await fetch(`${API_BASE_URL}/projects/client/${clientId}`);
    return handleResponse(response);
  },

  getByForeman: async (foremanId) => {
    const response = await fetch(`${API_BASE_URL}/projects/foreman/${foremanId}`);
    return handleResponse(response);
  },

  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`);
    return handleResponse(response);
  },

  create: async (projectData, username) => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...projectData, username })
    });
    return handleResponse(response);
  },

  update: async (id, projectData, username) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...projectData, username })
    });
    return handleResponse(response);
  },

  delete: async (id, username, role) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role })
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/projects/stats`);
    return handleResponse(response);
  }
};

// Payments API
export const paymentsAPI = {
  getByProject: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/payments/project/${projectId}`);
    return handleResponse(response);
  },

  getByClient: async (clientId) => {
    const response = await fetch(`${API_BASE_URL}/payments/client/${clientId}`);
    return handleResponse(response);
  },

  getRecent: async (clientId, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/payments/client/${clientId}/recent?limit=${limit}`);
    return handleResponse(response);
  },

  create: async (paymentData, username) => {
    const response = await fetch(`${API_BASE_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...paymentData, username })
    });
    return handleResponse(response);
  }
};

// Progress API
export const progressAPI = {
  getByProject: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/progress/project/${projectId}`);
    return handleResponse(response);
  },

  getRecent: async (clientId, limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/progress/client/${clientId}/recent?limit=${limit}`);
    return handleResponse(response);
  },

  create: async (progressData, username) => {
    const response = await fetch(`${API_BASE_URL}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...progressData, username })
    });
    return handleResponse(response);
  }
};

// Clients API
export const clientsAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/clients`);
    return handleResponse(response);
  },

  getByUserId: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/clients/user/${userId}`);
    return handleResponse(response);
  },

  create: async (clientData, username) => {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clientData, username })
    });
    return handleResponse(response);
  },

  update: async (id, clientData, username) => {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...clientData, username })
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/clients/stats`);
    return handleResponse(response);
  }
};

// Suppliers API
export const suppliersAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/suppliers`);
    return handleResponse(response);
  },

  getTop: async (limit = 5) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/top?limit=${limit}`);
    return handleResponse(response);
  },

  create: async (supplierData, username) => {
    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...supplierData, username })
    });
    return handleResponse(response);
  },

  update: async (id, supplierData, username) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...supplierData, username })
    });
    return handleResponse(response);
  },

  delete: async (id, username) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return handleResponse(response);
  },

  // New functions for purchases
  getAllPurchases: async () => {
    const response = await fetch(`${API_BASE_URL}/suppliers/purchases`);
    return handleResponse(response);
  },

  getPurchasesBySupplier: async (supplierId) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/purchases`);
    return handleResponse(response);
  },

  createPurchase: async (purchaseData, username) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...purchaseData, username })
    });
    return handleResponse(response);
  },

  // New function to get all materials for dropdown
  getAllMaterials: async () => {
    const response = await fetch(`${API_BASE_URL}/materials`);
    return handleResponse(response);
  },

  // New function for price comparison
  comparePrices: async (materialId, startDate, endDate) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/compare-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId, startDate, endDate })
    });
    return handleResponse(response);
  },

  // Get supplier details with purchase history
  getSupplierDetails: async (supplierId) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/details`);
    return handleResponse(response);
  }
};

// Messages API
export const messagesAPI = {
  getConversations: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/messages/conversations/${userId}`);
    return handleResponse(response);
  },

  getMessages: async (conversationId) => {
    const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`);
    return handleResponse(response);
  },

  sendMessage: async (messageData) => {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
    return handleResponse(response);
  },

  createConversation: async (conversationData) => {
    const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conversationData)
    });
    return handleResponse(response);
  },

  markAsRead: async (conversationId, userId) => {
    const response = await fetch(`${API_BASE_URL}/messages/${conversationId}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return handleResponse(response);
  },

  getUnreadCount: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/messages/unread-count/${userId}`);
    return handleResponse(response);
  }
};

// Logs API
export const logsAPI = {
  getAll: async (limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}`);
    return handleResponse(response);
  },

  getByUser: async (username, limit = 20) => {
    const response = await fetch(`${API_BASE_URL}/logs/user/${username}?limit=${limit}`);
    return handleResponse(response);
  },

  getByTable: async (tableName, recordId = null) => {
    let url = `${API_BASE_URL}/logs/table/${tableName}`;
    if (recordId) url += `?recordId=${recordId}`;
    const response = await fetch(url);
    return handleResponse(response);
  }
};

export default {
  auth: authAPI,
  materials: materialsAPI,
  users: usersAPI,
  dashboard: dashboardAPI,
  stock: stockAPI,
  projects: projectsAPI,
  payments: paymentsAPI,
  progress: progressAPI,
  clients: clientsAPI,
  suppliers: suppliersAPI,
  messages: messagesAPI,
  logs: logsAPI
};
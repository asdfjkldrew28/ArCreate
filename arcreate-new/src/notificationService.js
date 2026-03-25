// notificationService.js - Updated to sync with backend

const NOTIFICATIONS_KEY = 'user_notifications';
const NOTIFICATIONS_LAST_CHECK = 'notifications_last_check';
const NOTIFICATIONS_SEEN = 'notifications_seen';
const API_URL = 'http://localhost:5000/api';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.seenNotifications = new Set();
    this.currentUserId = null;
    this.loadFromStorage();
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
    this.loadFromStorage();
  }

  // Load notifications from localStorage
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(NOTIFICATIONS_KEY);
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
      
      // Load seen notifications IDs
      const seen = localStorage.getItem(NOTIFICATIONS_SEEN);
      if (seen) {
        const seenArray = JSON.parse(seen);
        this.seenNotifications = new Set(seenArray);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
      this.seenNotifications = new Set();
    }
  }

  // Save notifications to localStorage
  saveToStorage() {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
      localStorage.setItem(NOTIFICATIONS_SEEN, JSON.stringify(Array.from(this.seenNotifications)));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // Fetch notifications from backend
  async fetchFromBackend() {
    if (!this.currentUserId) return false;
    
    try {
      const response = await fetch(`${API_URL}/notifications/${this.currentUserId}?limit=50`);
      const data = await response.json();
      
      if (data.success) {
        // Convert backend notifications to frontend format
        const backendNotifications = data.notifications.map(n => ({
          id: n._id,
          type: n.type === 'material_request' ? 'request' : n.type,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          read: n.is_read,
          link: n.link,
          persistent: false,
          action: n.action,
          metadata: n.metadata
        }));
        
        // Merge with existing notifications (avoid duplicates)
        const existingIds = new Set(this.notifications.map(n => n.id));
        const newNotifications = backendNotifications.filter(n => !existingIds.has(n.id));
        
        if (newNotifications.length > 0) {
          this.notifications = [...newNotifications, ...this.notifications].slice(0, 50);
          this.saveToStorage();
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error fetching notifications from backend:', error);
    }
    return false;
  }

  // Mark notification as read on backend
  async markAsReadOnBackend(notificationId) {
    if (!this.currentUserId) return false;
    
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all as read on backend
  async markAllAsReadOnBackend() {
    if (!this.currentUserId) return false;
    
    try {
      await fetch(`${API_URL}/notifications/user/${this.currentUserId}/read-all`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Error marking all as read:', error);
      return false;
    }
  }

  // Clear all notifications on backend
  async clearAllOnBackend() {
    if (!this.currentUserId) return false;
    
    try {
      await fetch(`${API_URL}/notifications/user/${this.currentUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
  }

  // Add a new notification (local only, for immediate feedback)
  addNotification(notification) {
    const stableId = notification.id || this.generateStableId(notification);
    
    // Check if we already have this notification
    const existingIndex = this.notifications.findIndex(n => n.id === stableId);
    
    if (existingIndex !== -1) {
      // Update existing notification
      const existing = this.notifications[existingIndex];
      if (existing.message !== notification.message) {
        existing.message = notification.message;
        existing.timestamp = notification.timestamp || new Date().toISOString();
        this.saveToStorage();
      }
      return existing;
    }
    
    const newNotification = {
      id: stableId,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp || new Date().toISOString(),
      read: false,
      link: notification.link || null,
      persistent: notification.persistent || false,
      action: notification.action,
      metadata: notification.metadata
    };
    
    this.notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }
    
    this.saveToStorage();
    return newNotification;
  }

  // Add multiple notifications
  addNotifications(notifications) {
    let addedCount = 0;
    notifications.forEach(notification => {
      const added = this.addNotification(notification);
      if (added) addedCount++;
    });
    return addedCount;
  }

  // Mark as read (local + backend)
  async markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      
      // Also mark on backend if it's a backend notification ID
      if (notificationId && !notificationId.startsWith('low-stock-') && !notificationId.startsWith('task-updates')) {
        await this.markAsReadOnBackend(notificationId);
      }
      return true;
    }
    return false;
  }

  // Mark all as read (local + backend)
  async markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveToStorage();
    
    await this.markAllAsReadOnBackend();
    return true;
  }

  // Clear all (local + backend)
  async clearAll() {
    this.notifications = [];
    this.seenNotifications.clear();
    this.saveToStorage();
    
    await this.clearAllOnBackend();
    return true;
  }

  // Remove a specific notification
  async removeNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveToStorage();
    return true;
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Generate stable ID
  generateStableId(notification) {
    const key = `${notification.type}-${notification.title}-${notification.message}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return `${notification.type}-${Math.abs(hash)}`;
  }

  // Mark as seen
  markAsSeen(notificationId) {
    this.seenNotifications.add(notificationId);
    this.saveToStorage();
  }

  // Check if seen
  hasSeenNotification(notificationId) {
    return this.seenNotifications.has(notificationId);
  }

  // Sync with backend
  async syncWithBackend(userId) {
    this.setCurrentUser(userId);
    await this.fetchFromBackend();
    return true;
  }
}

const notificationService = new NotificationService();
export default notificationService;
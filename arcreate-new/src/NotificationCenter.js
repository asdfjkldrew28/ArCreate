// NotificationCenter.js - Updated with proper click handling and responsive design

import React, { useState, useEffect, useRef } from 'react';
import notificationService from './notificationService';
import './NotificationCenter.css';

const NotificationCenter = ({ notifications: externalNotifications, onMarkAsRead, onClearAll, onNotificationClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);

  // Check if mobile screen
  const isMobile = () => window.innerWidth <= 480;

  // Load persisted notifications on mount
  useEffect(() => {
    const persistedNotifications = notificationService.getNotifications();
    if (persistedNotifications.length > 0) {
      setNotifications(persistedNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    } else if (externalNotifications && externalNotifications.length > 0) {
      notificationService.addNotifications(externalNotifications);
      setNotifications(notificationService.getNotifications());
      setUnreadCount(notificationService.getUnreadCount());
    }
  }, []);

  // Update when external notifications change
  useEffect(() => {
    if (externalNotifications && externalNotifications.length > 0) {
      const existingIds = new Set(notifications.map(n => n.id));
      const newNotifications = externalNotifications.filter(n => !existingIds.has(n.id));
      
      if (newNotifications.length > 0) {
        notificationService.addNotifications(newNotifications);
        setNotifications(notificationService.getNotifications());
        setUnreadCount(notificationService.getUnreadCount());
      }
    }
  }, [externalNotifications, notifications]);

  // Handle click outside - works for both desktop and mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If dropdown is open and click is outside both bell and dropdown
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle window resize - close dropdown on orientation change
  useEffect(() => {
    const handleResize = () => {
      setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getNotificationIcon = (type) => {
    const icons = {
      message: 'fa-envelope',
      request: 'fa-clipboard-list',
      payment: 'fa-credit-card',
      project: 'fa-project-diagram',
      material: 'fa-box',
      safety: 'fa-shield-alt',
      task: 'fa-tasks',
      report: 'fa-file-alt',
      warning: 'fa-exclamation-triangle',
      success: 'fa-check-circle',
      info: 'fa-info-circle',
      danger: 'fa-times-circle'
    };
    return icons[type] || 'fa-bell';
  };

  const getNotificationColor = (type) => {
    const colors = {
      message: '#3b82f6',
      request: '#f59e0b',
      payment: '#10b981',
      project: '#8b5cf6',
      material: '#6b7280',
      safety: '#ef4444',
      task: '#f97316',
      report: '#06b6d4',
      warning: '#ef4444',
      success: '#10b981',
      info: '#3b82f6',
      danger: '#dc2626'
    };
    return colors[type] || '#667eea';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const handleMarkAsRead = (notificationId) => {
    if (notificationId === 'all') {
      notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      if (onMarkAsRead) onMarkAsRead('all');
    } else {
      notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (onMarkAsRead) onMarkAsRead(notificationId);
    }
  };

  const handleClearAll = () => {
    notificationService.clearAll();
    setNotifications([]);
    setUnreadCount(0);
    if (onClearAll) onClearAll();
  };

  const handleRemoveNotification = (notificationId, e) => {
    e.stopPropagation();
    notificationService.removeNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    const newUnreadCount = notifications.filter(n => n.id !== notificationId && !n.read).length;
    setUnreadCount(newUnreadCount);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    if (onNotificationClick) onNotificationClick(notification);
    setIsOpen(false);
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="notification-center">
      <button 
        ref={bellRef}
        className={`notification-bell ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" ref={dropdownRef}>
          <div className="notification-header">
            <h3>
              <i className="fas fa-bell"></i>
              Notifications
              {unreadCount > 0 && <span className="unread-count">{unreadCount} unread</span>}
            </h3>
            <div className="header-actions">
              {notifications.length > 0 && (
                <>
                  <button 
                    className="clear-all-btn" 
                    onClick={handleClearAll} 
                    title="Clear All"
                    aria-label="Clear all notifications"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <button 
                    className="mark-all-btn" 
                    onClick={() => handleMarkAsRead('all')} 
                    title="Mark All Read"
                    aria-label="Mark all as read"
                  >
                    <i className="fas fa-check-double"></i>
                  </button>
                </>
              )}
              <button 
                className="close-btn" 
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div 
                    className="notification-icon"
                    style={{ backgroundColor: `${getNotificationColor(notification.type)}20` }}
                  >
                    <i 
                      className={`fas ${getNotificationIcon(notification.type)}`}
                      style={{ color: getNotificationColor(notification.type) }}
                    ></i>
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      <i className="far fa-clock"></i>
                      {formatTime(notification.timestamp)}
                    </div>
                  </div>
                  {!notification.read && <div className="unread-dot"></div>}
                  <button 
                    className="remove-notification-btn"
                    onClick={(e) => handleRemoveNotification(notification.id, e)}
                    title="Remove"
                    aria-label="Remove notification"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-notifications">
                <i className="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <span>You're all caught up!</span>
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button 
                className="mark-all-read" 
                onClick={() => handleMarkAsRead('all')}
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
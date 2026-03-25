import { useState, useEffect, useCallback } from 'react';

const useNotifications = (fetchFunction, intervalTime = 60000) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFunction();
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    fetchNotifications();
    if (intervalTime > 0) {
      const interval = setInterval(fetchNotifications, intervalTime);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, intervalTime]);

  const markAsRead = (notificationId) => {
    if (notificationId === 'all') {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } else {
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    clearAll,
    addNotification,
    removeNotification,
    refresh: fetchNotifications
  };
};

export default useNotifications;
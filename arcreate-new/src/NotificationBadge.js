import React from 'react';
import './NotificationBadge.css';

const NotificationBadge = ({ count, variant = 'primary', showZero = false, pulse = true }) => {
  // Don't show badge if count is 0 and showZero is false
  if (count === 0 && !showZero) return null;
  
  // Format count for display (99+ for numbers > 99)
  const displayCount = count > 99 ? '99+' : count;
  
  // Determine variant class
  const variantClass = {
    primary: 'badge-primary',
    danger: 'badge-danger',
    warning: 'badge-warning',
    success: 'badge-success',
    info: 'badge-info'
  }[variant] || 'badge-primary';
  
  return (
    <span className={`notification-badge ${variantClass} ${pulse ? 'pulse-animation' : ''}`}>
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
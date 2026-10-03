import { createContext, useContext, useState, useEffect } from 'react';
import { getMockNotifications, markMockNotificationRead, markAllMockNotificationsRead } from '../data/api';

const NotificationContext = createContext();

export function NotificationProvider({ children, user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const notifs = getMockNotifications(user.id);
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read).length);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = (id) => {
    markMockNotificationRead(id);
    fetchNotifications();
  };

  const markAllAsRead = () => {
    markAllMockNotificationsRead(user.id);
    fetchNotifications();
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

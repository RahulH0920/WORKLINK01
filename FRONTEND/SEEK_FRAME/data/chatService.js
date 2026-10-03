/* ── WorkLink Two-Way Chat & Unread Message Service ── */

export function getConversationKey(workerId, employerId, jobId) {
  const wId = String(workerId || 'worker').trim();
  const eId = String(employerId || 'employer').trim();
  const jId = String(jobId || 'job').trim();
  return `conv_${wId}_${eId}_${jId}`;
}

export function getConversationMessages(convKey) {
  if (!convKey) return [];
  try {
    const raw = localStorage.getItem(`wl_chat_${convKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      }
    }
  } catch (err) {
    console.error('Error reading conversation messages:', err);
  }
  return [];
}

export function saveConversationMessages(convKey, messages) {
  if (!convKey || !Array.isArray(messages)) return;
  try {
    localStorage.setItem(`wl_chat_${convKey}`, JSON.stringify(messages));
    window.dispatchEvent(
      new CustomEvent('wl_chat_updated', {
        detail: { convKey, messages },
      })
    );
  } catch (err) {
    console.error('Error saving conversation messages:', err);
  }
}

export function sendChatMessage({
  convKey,
  jobId,
  jobTitle,
  senderId,
  senderRole, // 'employer' | 'worker'
  senderName,
  recipientId,
  recipientRole, // 'employer' | 'worker'
  recipientName,
  text,
}) {
  if (!text || !text.trim() || !convKey) return null;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    convKey,
    jobId: String(jobId || ''),
    jobTitle: jobTitle || 'Work Shift',
    senderId: String(senderId || ''),
    senderRole,
    senderName: senderName || (senderRole === 'employer' ? 'Employer' : 'Worker'),
    recipientId: String(recipientId || ''),
    recipientRole,
    recipientName: recipientName || (recipientRole === 'employer' ? 'Employer' : 'Worker'),
    text: text.trim(),
    timestamp: now.getTime(),
    time: timeStr,
    readByEmployer: senderRole === 'employer', // sender already knows they sent it
    readByWorker: senderRole === 'worker', // sender already knows they sent it
    readStatus: 'delivered', // 'sent' | 'delivered' | 'read'
  };

  const existing = getConversationMessages(convKey);
  const updated = [...existing, newMsg];
  saveConversationMessages(convKey, updated);

  return newMsg;
}

export function markConversationAsRead(convKey, currentRole) {
  if (!convKey || !currentRole) return;
  const messages = getConversationMessages(convKey);
  let hasChanges = false;

  const updated = messages.map((msg) => {
    if (currentRole === 'employer' && !msg.readByEmployer) {
      hasChanges = true;
      return { ...msg, readByEmployer: true, readStatus: 'read' };
    }
    if (currentRole === 'worker' && !msg.readByWorker) {
      hasChanges = true;
      return { ...msg, readByWorker: true, readStatus: 'read' };
    }
    return msg;
  });

  if (hasChanges) {
    saveConversationMessages(convKey, updated);
  }
}

export function getUnreadMessagesForRole(currentRole, currentUserId) {
  const unreadList = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wl_chat_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const msgs = JSON.parse(raw);
          if (Array.isArray(msgs)) {
            msgs.forEach((m) => {
              if (currentRole === 'employer') {
                if (m.senderRole === 'worker' && !m.readByEmployer) {
                  unreadList.push(m);
                }
              } else if (currentRole === 'worker') {
                if (m.senderRole === 'employer' && !m.readByWorker) {
                  unreadList.push(m);
                }
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error scanning unread messages:', err);
  }
  return unreadList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function getUnreadCountForConversation(convKey, currentRole) {
  const messages = getConversationMessages(convKey);
  if (currentRole === 'employer') {
    return messages.filter((m) => m.senderRole === 'worker' && !m.readByEmployer).length;
  }
  if (currentRole === 'worker') {
    return messages.filter((m) => m.senderRole === 'employer' && !m.readByWorker).length;
  }
  return 0;
}

export function getUnreadMessageNotifications(currentRole, currentUserId) {
  const unreadMessages = getUnreadMessagesForRole(currentRole, currentUserId);
  return unreadMessages.map((msg) => ({
    id: `notif-chat-${msg.id}`,
    type: 'message',
    convKey: msg.convKey,
    senderId: msg.senderId,
    senderRole: msg.senderRole,
    senderName: msg.senderName,
    recipientId: msg.recipientId,
    recipientRole: msg.recipientRole,
    jobId: msg.jobId,
    jobTitle: msg.jobTitle,
    title: `New message from ${msg.senderName}`,
    message: msg.text,
    time: msg.time || 'Just now',
    timestamp: msg.timestamp,
    unread: true,
    icon: '💬',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    category: 'Chat',
  }));
}

export function subscribeToChatUpdates(callback) {
  const handleCustom = () => callback();
  const handleStorage = (e) => {
    if (e.key && e.key.startsWith('wl_chat_')) {
      callback();
    }
  };

  window.addEventListener('wl_chat_updated', handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('wl_chat_updated', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}


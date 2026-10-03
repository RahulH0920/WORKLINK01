import React, { useState, useEffect, useRef } from 'react';
import { getMyApplications } from '../data/api';
import {
  getConversationKey,
  getConversationMessages,
  sendChatMessage,
  markConversationAsRead,
  getUnreadCountForConversation,
  subscribeToChatUpdates,
} from '../data/chatService';
import './WorkerMessages.css';

export default function WorkerMessages({
  user,
  activeEmployerContact = null,
  onNavigate,
  requireProfile,
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConvKey, setActiveConvKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatRefreshTick, setChatRefreshTick] = useState(0);

  const messagesEndRef = useRef(null);

  const workerId = String(user?._id || user?.id || 'worker');
  const workerName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Worker');

  // Load real conversations from worker's actual applications
  useEffect(() => {
    let isMounted = true;

    getMyApplications()
      .then((res) => {
        if (!isMounted) return;

        const convList = [];

        if (res?.success && Array.isArray(res.applications)) {
          res.applications.forEach((app, idx) => {
            const employer = app.job?.employer;
            const employerId = employer?._id || employer?.id || `emp-${idx}`;
            const employerName =
              employer?.name ||
              (employer?.firstName
                ? `${employer.firstName} ${employer.lastName || ''}`.trim()
                : 'WorkLink Employer');

            const jobId = app.job?._id || app.job?.id || `job-${idx}`;
            const jobTitle = app.job?.title || 'Work Assignment';
            const convKey = getConversationKey(workerId, employerId, jobId);

            // Fetch persisted messages
            let existingMsgs = getConversationMessages(convKey);

            // If empty, initialize welcoming context message from employer
            if (existingMsgs.length === 0) {
              const defaultText =
                app.status === 'accepted' || app.status === 'hired'
                  ? `Hello ${workerName}! Your application for "${jobTitle}" has been accepted. Feel free to ask any questions about the shift.`
                  : `Hello ${workerName}, thanks for your application for "${jobTitle}".`;

              sendChatMessage({
                convKey,
                jobId,
                jobTitle,
                senderId: employerId,
                senderRole: 'employer',
                senderName: employerName,
                recipientId: workerId,
                recipientRole: 'worker',
                recipientName: workerName,
                text: defaultText,
              });
              existingMsgs = getConversationMessages(convKey);
            }

            const lastMsg = existingMsgs[existingMsgs.length - 1];
            const unreadCount = getUnreadCountForConversation(convKey, 'worker');

            convList.push({
              convKey,
              employerId,
              employerName,
              employerLocation: employer?.location || app.job?.location || 'Bengaluru',
              jobId,
              jobTitle,
              jobDepartment: app.job?.department,
              jobPay: app.job?.pay,
              status: app.status || 'pending',
              lastMessage: lastMsg?.text || 'No messages yet',
              lastMessageTime: lastMsg?.time || 'Recent',
              unreadCount,
              initials: employerName.slice(0, 2).toUpperCase(),
              rawApplication: app,
            });
          });
        }

        // Handle explicitly targeted employer contact (from My Work -> Contact Employer)
        if (activeEmployerContact && activeEmployerContact.employerId) {
          const targetKey = getConversationKey(
            workerId,
            activeEmployerContact.employerId,
            activeEmployerContact.jobId || 'direct'
          );
          const existing = convList.find((c) => c.convKey === targetKey);

          if (!existing) {
            let existingMsgs = getConversationMessages(targetKey);
            if (existingMsgs.length === 0) {
              sendChatMessage({
                convKey: targetKey,
                jobId: activeEmployerContact.jobId || 'direct',
                jobTitle: activeEmployerContact.jobTitle || 'Work Assignment',
                senderId: activeEmployerContact.employerId,
                senderRole: 'employer',
                senderName: activeEmployerContact.employerName || 'Employer',
                recipientId: workerId,
                recipientRole: 'worker',
                recipientName: workerName,
                text: `Hello ${workerName}, please feel free to send any questions regarding "${activeEmployerContact.jobTitle || 'the work'}".`,
              });
              existingMsgs = getConversationMessages(targetKey);
            }

            const unreadCount = getUnreadCountForConversation(targetKey, 'worker');
            convList.unshift({
              convKey: targetKey,
              employerId: activeEmployerContact.employerId,
              employerName: activeEmployerContact.employerName || 'Employer',
              employerLocation: 'Bengaluru',
              jobId: activeEmployerContact.jobId,
              jobTitle: activeEmployerContact.jobTitle || 'Work Assignment',
              status: 'accepted',
              lastMessage: existingMsgs[existingMsgs.length - 1]?.text || '',
              lastMessageTime: existingMsgs[existingMsgs.length - 1]?.time || 'Just now',
              unreadCount,
              initials: (activeEmployerContact.employerName || 'EM').slice(0, 2).toUpperCase(),
              rawApplication: null,
            });
          }
        }

        // Fallback demo conversation if newly registered worker
        if (convList.length === 0) {
          const defaultKey = getConversationKey(workerId, 'emp1', 'j1');
          let existingMsgs = getConversationMessages(defaultKey);
          if (existingMsgs.length === 0) {
            sendChatMessage({
              convKey: defaultKey,
              jobId: 'j1',
              jobTitle: 'Senior Catering Assistant',
              senderId: 'emp1',
              senderRole: 'employer',
              senderName: 'Apex Hospitality Group',
              recipientId: workerId,
              recipientRole: 'worker',
              recipientName: workerName,
              text: `Hello ${workerName}! Your application for Senior Catering Assistant is approved. Shift reporting time is 08:30 AM tomorrow.`,
            });
            existingMsgs = getConversationMessages(defaultKey);
          }
          convList.push({
            convKey: defaultKey,
            employerId: 'emp1',
            employerName: 'Apex Hospitality Group',
            employerLocation: 'Indiranagar, Bengaluru',
            jobId: 'j1',
            jobTitle: 'Senior Catering Assistant',
            jobDepartment: 'Catering',
            jobPay: '₹950 / day',
            status: 'accepted',
            lastMessage: existingMsgs[existingMsgs.length - 1]?.text || '',
            lastMessageTime: existingMsgs[existingMsgs.length - 1]?.time || '10:30 AM',
            unreadCount: 0,
            initials: 'AH',
            rawApplication: null,
          });
        }

        setConversations(convList);

        // Select active conversation
        if (activeEmployerContact?.employerId) {
          const targetKey = getConversationKey(
            workerId,
            activeEmployerContact.employerId,
            activeEmployerContact.jobId || 'direct'
          );
          setActiveConvKey(targetKey);
          markConversationAsRead(targetKey, 'worker');
        } else if (convList.length > 0 && !activeConvKey) {
          setActiveConvKey(convList[0].convKey);
          markConversationAsRead(convList[0].convKey, 'worker');
        }
      })
      .catch((err) => {
        console.error('Error fetching worker conversations:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workerId, workerName, activeEmployerContact]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    const unsubscribe = subscribeToChatUpdates(() => {
      setChatRefreshTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Whenever active conversation is opened or ticks, mark unread messages as read
  useEffect(() => {
    if (activeConvKey) {
      markConversationAsRead(activeConvKey, 'worker');
      setConversations((prev) =>
        prev.map((c) => (c.convKey === activeConvKey ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [activeConvKey, chatRefreshTick]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvKey, chatRefreshTick]);

  const activeConv = conversations.find((c) => c.convKey === activeConvKey) || null;
  const currentMessages = activeConvKey ? getConversationMessages(activeConvKey) : [];

  // Filter conversations list by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.employerName.toLowerCase().includes(q) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  // Handle Send Message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeConv) return;

    sendChatMessage({
      convKey: activeConv.convKey,
      jobId: activeConv.jobId,
      jobTitle: activeConv.jobTitle,
      senderId: workerId,
      senderRole: 'worker',
      senderName: workerName,
      recipientId: activeConv.employerId,
      recipientRole: 'employer',
      recipientName: activeConv.employerName,
      text: inputText.trim(),
    });

    setInputText('');
  };

  return (
    <div className="whatsapp-chat-page fade-in">
      <div className="whatsapp-chat-layout">
        {/* ── Left Sidebar: Conversations List ── */}
        <aside className="whatsapp-sidebar">
          {/* Header */}
          <div className="whatsapp-sidebar-header">
            <div className="whatsapp-header-top">
              <div className="whatsapp-user-avatar">{workerName.slice(0, 2).toUpperCase()}</div>
              <div className="whatsapp-header-actions">
                <span className="whatsapp-badge-pill">{conversations.length} Chats</span>
              </div>
            </div>
            <div className="whatsapp-search-box">
              <span className="whatsapp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="whatsapp-clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations List */}
          <div className="whatsapp-conv-list">
            {loading ? (
              <div className="whatsapp-loading">
                <div className="whatsapp-spinner" />
                <span>Loading chats...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="whatsapp-empty-conv">
                <span style={{ fontSize: 36 }}>💬</span>
                <p>No conversations found</p>
                <button
                  type="button"
                  className="wrk-chat-send-btn"
                  style={{ marginTop: 8 }}
                  onClick={() => onNavigate && onNavigate('jobs')}
                >
                  Explore Jobs →
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.convKey === activeConvKey;
                const unread = getUnreadCountForConversation(conv.convKey, 'worker');
                const lastMsg = getConversationMessages(conv.convKey).slice(-1)[0];

                return (
                  <div
                    key={conv.convKey}
                    className={`whatsapp-conv-row ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveConvKey(conv.convKey)}
                  >
                    <div className="whatsapp-avatar-wrapper">
                      <div
                        className="whatsapp-row-avatar"
                        style={{ background: '#0284c7' }}
                      >
                        {conv.initials}
                      </div>
                      <span className="whatsapp-online-dot" />
                    </div>

                    <div className="whatsapp-row-details">
                      <div className="whatsapp-row-top">
                        <strong className="whatsapp-row-name">{conv.employerName}</strong>
                        <span className="whatsapp-row-time">
                          {lastMsg ? lastMsg.time : conv.lastMessageTime}
                        </span>
                      </div>
                      <div className="whatsapp-row-job">💼 {conv.jobTitle}</div>
                      <div className="whatsapp-row-bottom">
                        <span className="whatsapp-row-preview">
                          {lastMsg ? lastMsg.text : conv.lastMessage}
                        </span>
                        {unread > 0 && (
                          <span className="whatsapp-unread-count">{unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right Main Chat Window ── */}
        <main className="whatsapp-chat-main">
          {activeConv ? (
            <>
              {/* Topbar */}
              <div className="whatsapp-chat-topbar">
                <div className="whatsapp-chat-recipient">
                  <div
                    className="whatsapp-recipient-avatar"
                    style={{ background: '#0284c7' }}
                  >
                    {activeConv.initials}
                  </div>
                  <div className="whatsapp-recipient-info">
                    <div className="whatsapp-recipient-name-row">
                      <h4>{activeConv.employerName}</h4>
                      <span className="whatsapp-verified-pill" title="Verified Employer">
                        ✓ Verified Employer
                      </span>
                    </div>
                    <div className="whatsapp-recipient-meta">
                      <span className="online-text">online</span>
                      <span>•</span>
                      <span>💼 {activeConv.jobTitle}</span>
                      {activeConv.jobPay && (
                        <>
                          <span>•</span>
                          <span className="pay-tag">{activeConv.jobPay}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="whatsapp-topbar-actions">
                  <button
                    type="button"
                    className="whatsapp-btn-profile"
                    onClick={() => onNavigate && onNavigate('applications')}
                  >
                    📑 View Application
                  </button>
                </div>
              </div>

              {/* Message Feed (Two-Sided WhatsApp Conversation) */}
              <div className="whatsapp-message-feed">
                <div className="whatsapp-encryption-pill">
                  🔒 Messages are end-to-end encrypted & verified by WorkLink AI Security
                </div>

                {currentMessages.map((msg) => {
                  // Worker is viewing:
                  // msg.senderRole === 'worker'   -> RIGHT SIDE (Me)
                  // msg.senderRole === 'employer' -> LEFT SIDE (Them)
                  const isMe = msg.senderRole === 'worker';

                  return (
                    <div
                      key={msg.id}
                      className={`whatsapp-msg-row ${isMe ? 'msg-outgoing' : 'msg-incoming'}`}
                    >
                      {!isMe && (
                        <div className="whatsapp-incoming-avatar">{activeConv.initials}</div>
                      )}

                      <div className={`whatsapp-bubble ${isMe ? 'bubble-outgoing' : 'bubble-incoming'}`}>
                        {!isMe && (
                          <span className="whatsapp-bubble-sender-name">
                            {msg.senderName || activeConv.employerName}
                          </span>
                        )}
                        <div className="whatsapp-bubble-text">{msg.text}</div>
                        <div className="whatsapp-bubble-footer">
                          <span className="whatsapp-bubble-time">{msg.time}</span>
                          {isMe && (
                            <span
                              className={`whatsapp-check-marks ${
                                msg.readByEmployer ? 'checks-read' : 'checks-delivered'
                              }`}
                              title={msg.readByEmployer ? 'Read by Employer' : 'Delivered'}
                            >
                              ✓✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendMessage} className="whatsapp-input-bar">
                <button
                  type="button"
                  className="whatsapp-attach-btn"
                  title="Attach file or coordinates"
                  onClick={() => alert('Attachments supported: job documents, proof of work, coordinates.')}
                >
                  📎
                </button>

                <input
                  type="text"
                  className="whatsapp-input-field"
                  placeholder={`Type a message to ${activeConv.employerName}...`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  autoFocus
                />

                <button
                  type="submit"
                  className="whatsapp-send-btn"
                  disabled={!inputText.trim()}
                  title="Send Message"
                >
                  ➤
                </button>
              </form>
            </>
          ) : (
            <div className="whatsapp-empty-chat-state">
              <div className="whatsapp-empty-graphic">💬</div>
              <h3>WorkLink WhatsApp Chat</h3>
              <p>
                Send and receive messages with verified employers in real-time. Select a chat from
                the left sidebar to get started.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

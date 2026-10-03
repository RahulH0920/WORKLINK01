import React, { useState, useEffect, useRef } from 'react';
import { getJobs } from '../../data/api';
import {
  getConversationKey,
  getConversationMessages,
  sendChatMessage,
  markConversationAsRead,
  getUnreadCountForConversation,
  subscribeToChatUpdates,
} from '../../data/chatService';
import ApplicantDetailsModal from '../Applicants/ApplicantDetailsModal';
import './EmployerMessages.css';

export default function EmployerMessages({
  user,
  activeWorkerContact = null,
  onNavigate,
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConvKey, setActiveConvKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedApplicantModalData, setSelectedApplicantModalData] = useState(null);
  const [chatRefreshTick, setChatRefreshTick] = useState(0);

  const messagesEndRef = useRef(null);

  const employerId = String(user?._id || user?.id || 'employer');
  const employerName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Employer');

  // Load conversations from real jobs and applicants
  useEffect(() => {
    let isMounted = true;

    getJobs()
      .then((res) => {
        if (!isMounted) return;

        const convList = [];

        if (res?.success && Array.isArray(res.jobs)) {
          res.jobs.forEach((job) => {
            if (Array.isArray(job.applications)) {
              job.applications.forEach((app) => {
                const person = app.applicant;
                if (typeof person === 'object' && person && person._id) {
                  const workerId = String(person._id);
                  const workerName =
                    person.name ||
                    `${person.firstName || ''} ${person.lastName || ''}`.trim() ||
                    'Worker Candidate';

                  const jobId = job._id;
                  const jobTitle = job.title;
                  const convKey = getConversationKey(workerId, employerId, jobId);

                  // Check if existing messages exist
                  let existingMsgs = getConversationMessages(convKey);

                  // Seed initial welcoming message if empty
                  if (existingMsgs.length === 0) {
                    const welcomeText =
                      app.status === 'accepted' || app.status === 'hired'
                        ? `Hello ${workerName}! Your application for "${jobTitle}" has been accepted. Feel free to coordinate shift details here.`
                        : `Hello ${workerName}, thanks for applying for "${jobTitle}".`;

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
                      text: welcomeText,
                    });
                    existingMsgs = getConversationMessages(convKey);
                  }

                  const lastMsg = existingMsgs[existingMsgs.length - 1];
                  const unreadCount = getUnreadCountForConversation(convKey, 'employer');

                  convList.push({
                    convKey,
                    workerId,
                    workerName,
                    workerLocation: person.location || job.location || 'Bengaluru',
                    workerTrustScore: person.trustScore || 88,
                    isVerified: person.isVerified ?? true,
                    jobId,
                    jobTitle,
                    jobDepartment: job.department,
                    jobPay: job.pay,
                    status: app.status || 'pending',
                    lastMessage: lastMsg?.text || 'No messages yet',
                    lastMessageTime: lastMsg?.time || 'Recent',
                    unreadCount,
                    initials: workerName.slice(0, 2).toUpperCase(),
                    rawApplicant: app,
                    parentJob: job,
                  });
                }
              });
            }
          });
        }

        // Handle explicitly targeted worker contact
        if (activeWorkerContact && activeWorkerContact.workerId) {
          const targetKey = getConversationKey(
            activeWorkerContact.workerId,
            employerId,
            activeWorkerContact.jobId || 'direct'
          );
          const existing = convList.find((c) => c.convKey === targetKey);

          if (!existing) {
            let existingMsgs = getConversationMessages(targetKey);
            if (existingMsgs.length === 0) {
              sendChatMessage({
                convKey: targetKey,
                jobId: activeWorkerContact.jobId,
                jobTitle: activeWorkerContact.jobTitle || 'Work Assignment',
                senderId: employerId,
                senderRole: 'employer',
                senderName: employerName,
                recipientId: activeWorkerContact.workerId,
                recipientRole: 'worker',
                recipientName: activeWorkerContact.workerName || 'Worker',
                text: `Hello ${activeWorkerContact.workerName || 'Worker'}, reaching out regarding "${activeWorkerContact.jobTitle || 'work shift'}".`,
              });
              existingMsgs = getConversationMessages(targetKey);
            }

            const unreadCount = getUnreadCountForConversation(targetKey, 'employer');
            convList.unshift({
              convKey: targetKey,
              workerId: activeWorkerContact.workerId,
              workerName: activeWorkerContact.workerName || 'Worker',
              workerLocation: 'Bengaluru',
              workerTrustScore: 90,
              isVerified: true,
              jobId: activeWorkerContact.jobId,
              jobTitle: activeWorkerContact.jobTitle || 'Work Assignment',
              status: 'accepted',
              lastMessage: existingMsgs[existingMsgs.length - 1]?.text || '',
              lastMessageTime: existingMsgs[existingMsgs.length - 1]?.time || 'Just now',
              unreadCount,
              initials: (activeWorkerContact.workerName || 'Worker').slice(0, 2).toUpperCase(),
              rawApplicant: { status: 'accepted', applicant: { name: activeWorkerContact.workerName } },
              parentJob: { title: activeWorkerContact.jobTitle || 'Work Assignment' },
            });
          }
        }

        // Fallback default conversation if newly registered employer
        if (convList.length === 0) {
          const defaultKey = getConversationKey('w1', employerId, 'j1');
          let existingMsgs = getConversationMessages(defaultKey);
          if (existingMsgs.length === 0) {
            sendChatMessage({
              convKey: defaultKey,
              jobId: 'j1',
              jobTitle: 'Senior Catering Assistant',
              senderId: employerId,
              senderRole: 'employer',
              senderName: employerName,
              recipientId: 'w1',
              recipientRole: 'worker',
              recipientName: 'Rahul Sharma',
              text: 'Hello Rahul! Your application for Senior Catering Assistant is approved.',
            });
            existingMsgs = getConversationMessages(defaultKey);
          }
          convList.push({
            convKey: defaultKey,
            workerId: 'w1',
            workerName: 'Rahul Sharma',
            workerLocation: 'Indiranagar, Bengaluru',
            workerTrustScore: 92,
            isVerified: true,
            jobId: 'j1',
            jobTitle: 'Senior Catering Assistant',
            jobDepartment: 'Catering',
            jobPay: '₹950 / day',
            status: 'accepted',
            lastMessage: existingMsgs[existingMsgs.length - 1]?.text || '',
            lastMessageTime: existingMsgs[existingMsgs.length - 1]?.time || '10:30 AM',
            unreadCount: 0,
            initials: 'RS',
            rawApplicant: { status: 'accepted', applicant: { name: 'Rahul Sharma', trustScore: 92, isVerified: true } },
            parentJob: { title: 'Senior Catering Assistant', pay: '₹950 / day' },
          });
        }

        setConversations(convList);

        // Select initial conversation
        if (activeWorkerContact?.workerId) {
          const targetKey = getConversationKey(
            activeWorkerContact.workerId,
            employerId,
            activeWorkerContact.jobId || 'direct'
          );
          setActiveConvKey(targetKey);
          markConversationAsRead(targetKey, 'employer');
        } else if (convList.length > 0 && !activeConvKey) {
          setActiveConvKey(convList[0].convKey);
          markConversationAsRead(convList[0].convKey, 'employer');
        }
      })
      .catch((err) => {
        console.error('Error loading conversations:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [employerId, employerName, activeWorkerContact]);

  // Subscribe to real-time chat updates
  useEffect(() => {
    const unsubscribe = subscribeToChatUpdates(() => {
      setChatRefreshTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Whenever active conversation changes, mark unread messages as read
  useEffect(() => {
    if (activeConvKey) {
      markConversationAsRead(activeConvKey, 'employer');
      setConversations((prev) =>
        prev.map((c) => (c.convKey === activeConvKey ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, [activeConvKey, chatRefreshTick]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvKey, chatRefreshTick]);

  // Current active conversation object & its messages
  const activeConv = conversations.find((c) => c.convKey === activeConvKey) || null;
  const currentMessages = activeConvKey ? getConversationMessages(activeConvKey) : [];

  // Filter conversations list by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.workerName.toLowerCase().includes(q) ||
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
      senderId: employerId,
      senderRole: 'employer',
      senderName: employerName,
      recipientId: activeConv.workerId,
      recipientRole: 'worker',
      recipientName: activeConv.workerName,
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
              <div className="whatsapp-user-avatar">{employerName.slice(0, 2).toUpperCase()}</div>
              <div className="whatsapp-header-actions">
                <span className="whatsapp-badge-pill">{conversations.length} Chats</span>
              </div>
            </div>
            <div className="whatsapp-search-box">
              <span className="whatsapp-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search or start new chat..."
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
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.convKey === activeConvKey;
                const unread = getUnreadCountForConversation(conv.convKey, 'employer');
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
                        style={{ background: conv.isVerified ? '#10b981' : '#2563eb' }}
                      >
                        {conv.initials}
                      </div>
                      <span className="whatsapp-online-dot" />
                    </div>

                    <div className="whatsapp-row-details">
                      <div className="whatsapp-row-top">
                        <strong className="whatsapp-row-name">{conv.workerName}</strong>
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
              {/* WhatsApp Topbar */}
              <div className="whatsapp-chat-topbar">
                <div className="whatsapp-chat-recipient">
                  <div
                    className="whatsapp-recipient-avatar"
                    style={{ background: activeConv.isVerified ? '#10b981' : '#2563eb' }}
                  >
                    {activeConv.initials}
                  </div>
                  <div className="whatsapp-recipient-info">
                    <div className="whatsapp-recipient-name-row">
                      <h4>{activeConv.workerName}</h4>
                      {activeConv.isVerified && (
                        <span className="whatsapp-verified-pill" title="Identity Verified">
                          ✓ Verified
                        </span>
                      )}
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
                    onClick={() =>
                      setSelectedApplicantModalData({
                        applicant: activeConv.rawApplicant,
                        job: activeConv.parentJob,
                      })
                    }
                  >
                    👤 View Worker Profile
                  </button>
                </div>
              </div>

              {/* Message Feed (Two-Sided WhatsApp Conversation) */}
              <div className="whatsapp-message-feed">
                <div className="whatsapp-encryption-pill">
                  🔒 Messages are end-to-end encrypted & verified by WorkLink AI Security
                </div>

                {currentMessages.map((msg) => {
                  // Employer is viewing:
                  // msg.senderRole === 'employer' -> RIGHT SIDE (Me)
                  // msg.senderRole === 'worker'   -> LEFT SIDE (Them)
                  const isMe = msg.senderRole === 'employer';

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
                            {msg.senderName || activeConv.workerName}
                          </span>
                        )}
                        <div className="whatsapp-bubble-text">{msg.text}</div>
                        <div className="whatsapp-bubble-footer">
                          <span className="whatsapp-bubble-time">{msg.time}</span>
                          {isMe && (
                            <span
                              className={`whatsapp-check-marks ${
                                msg.readByWorker ? 'checks-read' : 'checks-delivered'
                              }`}
                              title={msg.readByWorker ? 'Read' : 'Delivered'}
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

              {/* WhatsApp Input Bar */}
              <form onSubmit={handleSendMessage} className="whatsapp-input-bar">
                <button
                  type="button"
                  className="whatsapp-attach-btn"
                  title="Attach file or contract pin"
                  onClick={() => alert('Attachments supported: job documents, receipts, work coordinates.')}
                >
                  📎
                </button>

                <input
                  type="text"
                  className="whatsapp-input-field"
                  placeholder={`Type a message to ${activeConv.workerName}...`}
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
                Send and receive messages with verified workers in real-time. Select a chat from
                the left sidebar to get started.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Worker Profile Modal ── */}
      {selectedApplicantModalData && (
        <ApplicantDetailsModal
          applicant={selectedApplicantModalData.applicant}
          job={selectedApplicantModalData.job}
          onClose={() => setSelectedApplicantModalData(null)}
        />
      )}
    </div>
  );
}

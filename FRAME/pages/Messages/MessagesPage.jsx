import { useState } from 'react';
import './MessagesPage.css';

const CONTACTS = [];

const MESSAGES = [];

export default function MessagesPage({ user, requireProfile }) {
  const isNewUser = !user || user.trustScore <= 0;
  const userContacts = isNewUser ? [] : CONTACTS;
  const [activeContact, setActiveContact] = useState(userContacts[0] || null);
  const [messageText, setMessageText] = useState('');

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    requireProfile('send a message', () => {
      // actual send logic would go here
      setMessageText('');
    });
  };

  return (
    <div className="messages-page page fade-up">
      <div className="messages-container card">
        <div className="messages-sidebar">
          <div className="messages-search">
            <input type="text" className="input" placeholder="Search messages..." />
          </div>
          <div className="contacts-list">
            {userContacts.length > 0 ? (
              userContacts.map(contact => (
                <div 
                  key={contact.id} 
                  className={`contact-item ${activeContact?.id === contact.id ? 'active' : ''}`}
                  onClick={() => setActiveContact(contact)}
                >
                  <div className="contact-avatar">{contact.avatar}</div>
                  <div className="contact-info">
                    <div className="contact-header">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-time">{contact.time}</span>
                    </div>
                    <div className="contact-preview">
                      <span className="last-message">{contact.lastMessage}</span>
                      {contact.unread > 0 && <span className="unread-badge">{contact.unread}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-contacts">
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <p>No conversations yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="chat-area">
          {activeContact ? (
            <>
              <div className="chat-header">
                <div className="contact-avatar">{activeContact.avatar}</div>
                <div className="chat-header-info">
                  <h3>{activeContact.name}</h3>
                  <span className="status-online">Online</span>
                </div>
                <button className="btn btn-outline btn-sm ml-auto">View Profile</button>
              </div>

              <div className="chat-messages">
                {MESSAGES.map(msg => (
                  <div key={msg.id} className={`message-bubble-wrapper ${msg.isMe ? 'me' : 'them'}`}>
                    {!msg.isMe && <div className="message-avatar">{msg.sender.charAt(0)}</div>}
                    <div className="message-content">
                      <div className="message-bubble">{msg.text}</div>
                      <div className="message-time">{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input-area">
                <button className="icon-btn">📎</button>
                <input 
                  type="text" 
                  className="input chat-input" 
                  placeholder="Type a message..." 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-primary" onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className="chat-empty">
              <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
              <h3>No Messages Yet</h3>
              <p className="text-muted">When you apply to jobs or employers reach out, your conversations will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

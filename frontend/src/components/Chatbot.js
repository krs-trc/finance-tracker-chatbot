// src/components/Chatbot.js
// Main chatbot interface: displays messages and handles user input
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Chatbot.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Render chatbot reply text: bold **text**, line breaks, etc.
function FormattedMessage({ text }) {
  const lines = text.split('\n');
  return (
    <div className="msg-text">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className={line === '' ? 'msg-spacer' : ''}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

// Quick-action suggestion chips
const SUGGESTIONS = [
  { label: '📊 Quick Summary', text: 'Show my summary' },
  { label: '📋 Monthly Report', text: 'Monthly report' },
  { label: '❓ Help', text: 'Help' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Chatbot({ onTransactionLogged }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Welcome message on first mount
  useEffect(() => {
    setMessages([
      {
        role: 'bot',
        text: `👋 Hey ${user?.name?.split(' ')[0] || 'there'}! I'm your FinTrack assistant.\n\n` +
          `I can help you:\n` +
          `• **Log expenses** — "Spent RM30 on lunch"\n` +
          `• **Log income** — "Received RM2000 salary"\n` +
          `• **Quick summary** — "Show my summary"\n` +
          `• **Monthly report** — "Monthly report"\n\n` +
          `What would you like to do today?`,
        type: 'welcome',
        time: new Date(),
      },
    ]);
  }, [user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    // Add user message to chat
    const userMsg = { role: 'user', text: trimmed, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat', { message: trimmed });
      const botMsg = {
        role: 'bot',
        text: res.data.reply,
        type: res.data.type,
        time: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // If a transaction was logged, notify parent to refresh balance
      if (res.data.type === 'transaction_logged' && onTransactionLogged) {
        onTransactionLogged();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: '❌ Sorry, something went wrong. Please try again.',
          type: 'error',
          time: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatbot">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-avatar">🤖</div>
          <div>
            <h2 className="chat-title">FinTrack Assistant</h2>
            <span className="chat-status">
              <span className="status-dot" />
              Always online
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-wrap msg-${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="msg-avatar">🤖</div>
            )}
            <div className={`msg-bubble ${msg.role === 'bot' ? 'bubble-bot' : 'bubble-user'}`}>
              <FormattedMessage text={msg.text} />
              <span className="msg-time">
                {msg.time?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="msg-wrap msg-bot">
            <div className="msg-avatar">🤖</div>
            <div className="msg-bubble bubble-bot typing-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            className="suggestion-chip"
            onClick={() => sendMessage(s.text)}
            disabled={loading}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder='Try: "Spent RM25 on coffee" or "Show my summary"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

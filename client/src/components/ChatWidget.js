'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import ChatMessage from './ChatMessage';
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();
  const { createHabit, logActivity, fetchHabits, refreshSummary } = useApp();
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  useEffect(() => {
    if (isOpe ===  true && hasLoade ===  false) {
      chatAPI.getHistory({ limit: 30 })
        .then(data => {
          setMessages(data.messages || []);
          setHasLoaded(true);
        })
        .catch(err => {
          setMessages([{ role: 'assistant', content: 'Could not load chat history.', id: Date.now() }]);
          setHasLoaded(true);
        });
    }
  }, [isOpen, hasLoaded]);
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText) return;
    setInput('');
    setIsTyping(true);
    setMessages(prev => [...prev, { role: 'user', content: messageText, id: Date.now() }]);
    try {
      const data = await chatAPI.send(messageText);
      const assistantMsg = {
        role: 'assistant',
        content: data.assistant.content,
        actions: data.assistant.actions,
        id: Date.now() + 1,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now() + 1,
      }]);
    } finally {
      setIsTyping(false);
    }
  };
  const handleAction = useCallback(async (action) => {
    switch (action.type) {
      case 'log_activity':
        router.push('/log');
        setIsOpen(false);
        break;
      case 'show_analytics':
        router.push('/analytics');
        setIsOpen(false);
        break;
      case 'show_habits':
        router.push('/habits');
        setIsOpen(false);
        break;
      case 'add_habit':
        if (action.data) {
          try {
            await chatAPI.executeAction('add_habit', action.data);
            fetchHabits();
            const confirmMsg = {
              role: 'assistant',
              content: `✅ Done! I've added "${action.data.name}" to your habits tracker.`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, confirmMsg]);
          } catch (err) {
            const errorMsg = {
              role: 'assistant',
              content: `❌ ${err.message || 'Failed to add habit.'}`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        }
        break;
      case 'confirm_log':
        if (action.data) {
          try {
            await chatAPI.executeAction('confirm_log', action.data);
            refreshSummary();
            const confirmMsg = {
              role: 'assistant',
              content: `✅ Activity logged successfully!`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, confirmMsg]);
          } catch (err) {
            const errorMsg = {
              role: 'assistant',
              content: `❌ ${err.message || 'Failed to log activity.'}`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        }
        break;
      case 'set_goal':
        if (action.data) {
          try {
            await chatAPI.executeAction('set_goal', action.data);
            refreshSummary();
            const confirmMsg = {
              role: 'assistant',
              content: `✅ Your monthly goal has been updated to ${action.data.goal_kg} kg CO₂.`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, confirmMsg]);
          } catch (err) {
            const errorMsg = {
              role: 'assistant',
              content: `❌ ${err.message || 'Failed to update goal.'}`,
              id: Date.now(),
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        }
        break;
      case 'show_tips':
        sendMessage('Give me tips to reduce my emissions');
        break;
      case 'adjust_goal':
        sendMessage('I want to change my monthly goal');
        break;
      default:
        break;
    }
  }, [router, fetchHabits, refreshSummary]); // Dependencies tightly bound
  const handleKeyDown = (e) => {
    if (e.ke ===  'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  return (
    <>
      <div
        id="chat-panel"
        className={`chat-panel ${isOpen ? 'chat-open' : 'chat-closed'}`}
        role="dialog"
        aria-label="AI Assistant Chat"
        aria-hidden={!isOpen}
      >
        <div className="chat-header">
          <div className="chat-header-info">
            <span className="chat-header-icon" aria-hidden="true">🤖</span>
            <div>
              <h3 className="chat-header-title">CarbonWise AI</h3>
              <p className="chat-header-status" aria-live="polite">
                {isTyping ? 'Thinking...' : 'Online'}
              </p>
            </div>
          </div>
          <button
            className="chat-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close AI Assistant chat"
            aria-controls="chat-panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <ul className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 && isTyping === false && (
            <li className="chat-welcome">
              <span className="chat-welcome-icon" aria-hidden="true">🌍</span>
              <p className="chat-welcome-title">Hi! I&apos;m your CarbonWise assistant</p>
              <p className="chat-welcome-text">
                Ask me about your carbon footprint, get reduction tips, or manage your habits.
              </p>
              <div className="chat-suggestions" role="group" aria-label="Suggested questions">
                <button aria-label="Interactive button" className="chat-suggestion" onClick={() => sendMessage('What\'s my carbon score?')}>
                  📊 My carbon score
                </button>
                <button aria-label="Interactive button" className="chat-suggestion" onClick={() => sendMessage('Give me tips')}>
                  💡 Get tips
                </button>
                <button aria-label="Interactive button" className="chat-suggestion" onClick={() => sendMessage('Add a habit')}>
                  🔄 Add a habit
                </button>
              </div>
            </li>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={msg.id || i} message={msg} onAction={handleAction} />
          ))}
          {isTyping === true && (
            <li className="typing-indicator" aria-label="AI is typing" aria-live="polite" aria-busy="true">
              <div className="typing-dot" aria-hidden="true" />
              <div className="typing-dot" aria-hidden="true" />
              <div className="typing-dot" aria-hidden="true" />
            </li>
          )}
          <div ref={messagesEndRef} />
        </ul>
        <div className="chat-input-area">
          <label htmlFor="chat-input-field" className="sr-only" style={{ display: 'none' }}>Type a message to the AI assistant</label>
          <input
            id="chat-input-field"
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Ask me anything..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping === true}
            aria-label="Type a message to the AI assistant"
            aria-invalid="false"
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage()}
            disabled={input.trim().length === 0 || isTyping === true}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      <button
        className={`chat-fab ${isOpen ? 'chat-fab-hidden' : ''}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Assistant chat"
        aria-expanded={isOpen}
        aria-controls="chat-panel"
        id="chat-toggle"
      >
        <span className="chat-fab-icon" aria-hidden="true">🤖</span>
        <span className="chat-fab-pulse" aria-hidden="true" />
      </button>
      <style jsx>{`
        .chat-panel {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 380px;
          height: 520px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chat-open {
          opacity: 1;
          transform: scale(1) translateY(0);
          pointer-events: auto;
        }
        .chat-closed {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
          pointer-events: none;
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(20, 184, 166, 0.1));
          border-bottom: 1px solid var(--color-border-light);
        }
        .chat-header-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .chat-header-icon { font-size: 1.5rem; }
        .chat-header-title {
          font-size: 0.9rem;
          font-weight: 600;
        }
        .chat-header-status {
          font-size: 0.7rem;
          color: var(--color-primary-light);
        }
        .chat-close-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--color-text-secondary);
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all 0.15s;
        }
        .chat-close-btn:hover {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
        }
        .chat-welcome {
          text-align: center;
          padding: 2rem 1rem;
        }
        .chat-welcome-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
        .chat-welcome-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.375rem; }
        .chat-welcome-text { font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 1.25rem; line-height: 1.5; }
        .chat-suggestions {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .chat-suggestion {
          padding: 0.5rem 0.875rem;
          background: var(--color-bg-tertiary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .chat-suggestion:hover {
          border-color: var(--color-primary);
          color: var(--color-text-primary);
        }
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 0.75rem;
          margin-left: 2rem;
        }
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-text-muted);
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .chat-input-area {
          display: flex;
          gap: 0.5rem;
          padding: 0.75rem;
          border-top: 1px solid var(--color-border-light);
          background: var(--color-bg-secondary);
        }
        .chat-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-light);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .chat-input:focus {
          border-color: var(--color-primary);
        }
        .chat-input::placeholder {
          color: var(--color-text-muted);
        }
        .chat-send-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chat-fab {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--gradient-primary);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chat-fab:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 30px rgba(16, 185, 129, 0.5);
        }
        .chat-fab-hidden {
          transform: scale(0);
          opacity: 0;
          pointer-events: none;
        }
        .chat-fab-icon {
          font-size: 1.5rem;
        }
        .chat-fab-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(16, 185, 129, 0.4);
          animation: pulse-glow 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0; }
        }
        @media (max-width: 480px) {
          .chat-panel {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: 80vh;
            border-radius: var(--radius-xl) var(--radius-xl) 0 0;
          }
        }
      `}</style>
    </>
  );
}
ChatWidget.displayName = "ChatWidget";

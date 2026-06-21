'use client';
import PropTypes from 'prop-types';
export default function ChatMessage({ message, onAction = () =>  }) {
  const isAssistant = message.rol ===  'assistant';
  const renderContent = (text) => {
    if (!text) return null;
    const parts = String(text).split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };
  return (
    <li className={`chat-msg ${isAssistant ? 'chat-msg-assistant' : 'chat-msg-user'}`}>
      {isAssistant && (
        <div className="chat-avatar" aria-hidden="true">🤖</div>
      )}
      <div className={`chat-bubble ${isAssistant ? 'bubble-assistant' : 'bubble-user'}`}>
        <div className="chat-text">{renderContent(message.content)}</div>
        {isAssistant && message.actions?.length > 0 && (
          <div className="chat-actions" role="group" aria-label="Suggested actions">
            {message.actions.slice(0, 3).map((action, i) => (
              <button aria-label="Interactive button"
                key={i}
                className="chat-action-btn"
                onClick={() => onAction(action)}
                aria-label={String(action.label)}
              >
                {String(action.label)}
              </button>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .chat-msg {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          animation: fadeIn 0.3s ease-out;
        }
        .chat-msg-user {
          justify-content: flex-end;
        }
        .chat-msg-assistant {
          justify-content: flex-start;
        }
        .chat-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          flex-shrink: 0;
          margin-top: 4px;
        }
        .chat-bubble {
          max-width: 85%;
          padding: 0.625rem 0.875rem;
          border-radius: 12px;
          font-size: 0.82rem;
          line-height: 1.5;
        }
        .bubble-user {
          background: linear-gradient(135deg, #10b981, #14b8a6);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .bubble-assistant {
          background: var(--color-bg-tertiary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-light);
          border-bottom-left-radius: 4px;
        }
        .chat-text {
          white-space: pre-wrap;
          word-break: break-word;
        }
        .chat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-top: 0.5rem;
        }
        .chat-action-btn {
          padding: 0.375rem 0.625rem;
          font-size: 0.72rem;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 6px;
          color: var(--color-primary-light);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .chat-action-btn:hover {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.5);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </li>
  );
}
ChatMessage.displayName = "ChatMessage";
ChatMessage.propTypes = {
  message: PropTypes.shape({
    role: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    actions: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        data: PropTypes.object
      })
    ),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onAction: PropTypes.func
};

import { useState } from 'react';

const CallControls = ({
  callStatus,
  isMicActive,
  onStartCall,
  onEndCall,
  onToggleMic,
}) => {
  const [name, setName] = useState('');

  const handleStart = async () => {
    await onStartCall(name);
    setName('');
  };

  const canStart = callStatus === 'idle' || callStatus === 'ended';

  return (
    <div className="call-controls">
      <div className="control-helper-text">
        {canStart && 'Tap Start Call, then speak naturally to book or manage appointments.'}
        {callStatus === 'connecting' && 'Preparing voice connection...'}
        {callStatus === 'connected' && 'You can mute anytime while the assistant continues processing.'}
        {callStatus === 'ending' && 'Generating end-of-call summary...'}
      </div>

      {canStart && (
        <input
          className="name-input"
          type="text"
          placeholder="Your name (optional)"
          value={name}
          maxLength={50}
          onChange={(event) => setName(event.target.value)}
        />
      )}

      {canStart && (
        <button type="button" className="btn btn-start" onClick={handleStart}>
          Start Call
        </button>
      )}

      {callStatus === 'connecting' && (
        <button type="button" className="btn btn-connecting" disabled>
          <span className="btn-spinner" />
          Connecting...
        </button>
      )}

      {callStatus === 'connected' && (
        <div className="btn-row">
          <button
            type="button"
            className={`btn btn-mute ${isMicActive ? '' : 'muted'}`}
            onClick={onToggleMic}
          >
            🎤 {isMicActive ? 'Mute' : 'Unmute'}
          </button>
          <button type="button" className="btn btn-end" onClick={onEndCall}>
            📵 End Call
          </button>
        </div>
      )}

      {callStatus === 'ending' && (
        <button type="button" className="btn btn-ending" disabled>
          <span className="btn-spinner" />
          Ending call...
        </button>
      )}

      <style>{`
        .call-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .control-helper-text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          min-height: 18px;
        }
        .name-input {
          width: 100%;
          padding: 12px 16px;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-size: var(--text-base);
          outline: none;
          box-sizing: border-box;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .name-input:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-glow);
        }
        .btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-base);
          font-weight: var(--font-semibold);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-start {
          background: linear-gradient(135deg, var(--color-accent), #7b5ea7);
          color: white;
          box-shadow: var(--shadow-accent);
        }
        .btn-start:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 32px var(--color-accent-glow);
        }
        .btn-start:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-end {
          background: var(--color-error-bg);
          color: var(--color-error);
          border: 1px solid rgba(248, 113, 113, 0.3);
          flex: 1;
        }
        .btn-end:hover {
          background: rgba(248, 113, 113, 0.15);
        }
        .btn-mute {
          background: var(--color-bg-elevated);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          flex: 1;
        }
        .btn-mute.muted {
          border-color: rgba(248, 113, 113, 0.4);
          color: var(--color-error);
          background: var(--color-error-bg);
        }
        .btn-row {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .btn-connecting {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        .btn-ending {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .btn-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default CallControls;

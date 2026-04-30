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
        .name-input {
          width: 100%;
          padding: 12px 16px;
          background: #1a1a26;
          border: 1px solid #2a2a3a;
          border-radius: 10px;
          color: #f0f0f0;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }
        .name-input:focus {
          border-color: #4a9eff;
        }
        .btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
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
          background: #1a6a3a;
          color: white;
        }
        .btn-start:hover:not(:disabled) {
          background: #2a8a4a;
        }
        .btn-end {
          background: #1a1a26;
          color: #ff6b6b;
          border: 1px solid #ff6b6b;
          flex: 1;
        }
        .btn-end:hover {
          background: #3a1a1a;
        }
        .btn-mute {
          background: #1a1a26;
          color: #e0e0e0;
          border: 1px solid #2a2a3a;
          flex: 1;
        }
        .btn-mute.muted {
          border-color: #ff6b6b;
          color: #ff6b6b;
        }
        .btn-row {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .btn-connecting {
          background: #1a2a4a;
          color: #888;
        }
        .btn-ending {
          background: #1a1a26;
          color: #888;
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
      `}</style>
    </div>
  );
};

export default CallControls;

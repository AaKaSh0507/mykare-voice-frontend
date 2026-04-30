import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_ENV_ERROR_MESSAGE,
  createConversation,
  endConversation,
} from '../services/tavus.js';

const getStatusText = (avatarStatus) => {
  if (avatarStatus === 'loading') return 'Connecting...';
  if (avatarStatus === 'error') return 'Connection failed';
  return 'Ready to assist';
};

const isMissingConfig = (value) => !value || value.startsWith('PASTE_');

const AvatarDisplay = ({ isCallActive, isAgentSpeaking, sessionId, onAvatarReady }) => {
  const [avatarStatus, setAvatarStatus] = useState('idle');
  const [conversationUrl, setConversationUrl] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasTavusConfig, setHasTavusConfig] = useState(true);
  const previousCallActive = useRef(isCallActive);

  useEffect(() => {
    console.log(`AvatarDisplay: isCallActive changed to ${String(isCallActive)}`);
    const wasCallActive = previousCallActive.current;
    previousCallActive.current = isCallActive;

    const apiKey = import.meta.env.VITE_TAVUS_API_KEY?.trim();
    const replicaId = import.meta.env.VITE_TAVUS_REPLICA_ID?.trim();

    const startConversation = async () => {
      setAvatarStatus('loading');
      setErrorMessage(null);

      if (isMissingConfig(apiKey) || isMissingConfig(replicaId)) {
        const envWarning = `${AVATAR_ENV_ERROR_MESSAGE}. Replace placeholder values before starting a call.`;
        console.log(`AvatarDisplay: error = ${envWarning}`);
        setHasTavusConfig(false);
        setAvatarStatus('error');
        setErrorMessage(envWarning);
        return;
      }

      try {
        setHasTavusConfig(true);
        console.log('AvatarDisplay: creating Tavus conversation...');
        const conversation = await createConversation(apiKey, replicaId, sessionId);
        console.log('AvatarDisplay: API response received', conversation);
        console.log(`AvatarDisplay: conversation_url = ${conversation.conversation_url ?? ''}`);
        setConversationUrl(conversation.conversation_url ?? null);
        setConversationId(conversation.conversation_id ?? null);
      } catch (error) {
        console.log(`AvatarDisplay: error = ${error instanceof Error ? error.message : String(error)}`);
        setAvatarStatus('error');
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    if (isCallActive && sessionId && !wasCallActive) {
      startConversation();
      return;
    }

    if (!isCallActive && wasCallActive && conversationId) {
      if (apiKey && !isMissingConfig(apiKey)) {
        endConversation(apiKey, conversationId);
      }
      setConversationUrl(null);
      setConversationId(null);
      setErrorMessage(null);
      setAvatarStatus('idle');
    }
  }, [isCallActive, sessionId, conversationId]);

  const handleRetry = () => {
    setAvatarStatus('idle');
    setErrorMessage(null);
    previousCallActive.current = false;
  };

  const showFallback = !hasTavusConfig || avatarStatus !== 'ready';

  const handleIframeLoad = () => {
    if (conversationUrl && conversationUrl !== 'about:blank') {
      setAvatarStatus('ready');
      if (onAvatarReady) {
        onAvatarReady();
      }
    }
  };

  return (
    <div className="avatar-display">
      {showFallback && (
        <div className="avatar-fallback">
          <div className={`avatar-circle ${isAgentSpeaking ? 'speaking' : ''}`}>
            <div className={`pulse-ring ${isAgentSpeaking ? 'active' : ''}`} />
            <div className={`waveform ${isCallActive ? 'active' : ''}`}>
              <span className="bar bar-1" />
              <span className="bar bar-2" />
              <span className="bar bar-3" />
              <span className="bar bar-4" />
              <span className="bar bar-5" />
            </div>
          </div>
          <div className="avatar-name">Aria</div>
          <div className="avatar-status-line">{getStatusText(avatarStatus)}</div>
          {errorMessage && (
            <div className="avatar-warning">
              {errorMessage}
              {!hasTavusConfig && (
                <button className="avatar-retry-btn" type="button" onClick={handleRetry}>
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <iframe
        key={conversationUrl}
        src={conversationUrl || 'about:blank'}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
        title="Tavus AI Avatar"
        style={{
          opacity: avatarStatus === 'ready' ? 1 : 0,
          pointerEvents: avatarStatus === 'ready' ? 'auto' : 'none',
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          transition: 'opacity var(--transition-slow)',
        }}
        onLoad={handleIframeLoad}
      />

      <style>{`
        .avatar-display {
          position: relative;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #0a0a16 0%, #0f0f1f 50%, #0a0a16 100%);
          overflow: hidden;
        }
        .avatar-fallback {
          position: absolute;
          inset: 0;
          z-index: 3;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          padding: var(--space-6);
          text-align: center;
        }
        .avatar-circle {
          width: 240px;
          height: 240px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background: linear-gradient(135deg, #161630, #1e1e3f);
          box-shadow: var(--shadow-accent);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: var(--radius-full);
        }
        .pulse-ring.active {
          animation: pulse-ring 1.5s ease-out infinite;
        }
        .waveform {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          height: 40px;
          z-index: 1;
        }
        .bar {
          width: 4px;
          height: 16px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          transition: height var(--transition-base);
        }
        .waveform.active .bar {
          animation: waveform 1s ease-in-out infinite;
        }
        .bar-1 { animation-delay: 0s; }
        .bar-2 { animation-delay: 0.12s; }
        .bar-3 { animation-delay: 0.24s; }
        .bar-4 { animation-delay: 0.36s; }
        .bar-5 { animation-delay: 0.48s; }
        .avatar-name {
          margin-top: var(--space-2);
          font-size: var(--text-xl);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .avatar-status-line {
          color: var(--color-text-muted);
          font-size: var(--text-sm);
        }
        .avatar-warning {
          margin-top: var(--space-2);
          max-width: 460px;
          color: var(--color-warning);
          background: var(--color-warning-bg);
          border: 1px solid rgba(251, 191, 36, 0.2);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
        }
        .avatar-retry-btn {
          padding: 8px 18px;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: var(--text-sm);
          transition: background var(--transition-fast);
        }
        .avatar-retry-btn:hover {
          background: var(--color-bg-hover);
        }
        @keyframes waveform {
          0%, 100% { height: 12px; opacity: 0.7; }
          50% { height: 40px; opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 var(--color-accent-glow); }
          70% { box-shadow: 0 0 0 20px rgba(91, 110, 245, 0); }
          100% { box-shadow: 0 0 0 0 rgba(91, 110, 245, 0); }
        }
        @media (max-width: 768px) {
          .avatar-circle {
            width: 160px;
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
};

export default AvatarDisplay;

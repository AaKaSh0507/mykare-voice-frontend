import { useEffect, useRef, useState } from 'react';

const TAVUS_BASE_URL = 'https://tavusapi.com';
const ENV_ERROR_MESSAGE =
  'Avatar not configured. Set VITE_TAVUS_API_KEY and VITE_TAVUS_REPLICA_ID in .env';

export async function createConversation(apiKey, replicaId, sessionId) {
  const response = await fetch(`${TAVUS_BASE_URL}/v2/conversations`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replica_id: replicaId,
      conversation_name: `mykare-session-${sessionId}`,
      properties: {
        max_call_duration: 1800,
        participant_left_timeout: 30,
        enable_recording: false,
      },
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Failed to create Tavus conversation: ${response.status} ${bodyText}`,
    );
  }

  return response.json();
}

export async function endConversation(apiKey, conversationId) {
  try {
    const response = await fetch(
      `${TAVUS_BASE_URL}/v2/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers: { 'x-api-key': apiKey },
      },
    );

    if (response.ok || response.status === 404) {
      return true;
    }

    const bodyText = await response.text();
    console.error(
      `Failed to end Tavus conversation: ${response.status} ${bodyText}`,
    );
    return false;
  } catch (error) {
    console.error('Failed to end Tavus conversation:', error);
    return false;
  }
}

const PersonPlaceholder = () => (
  <>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="currentColor" />
      <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill="currentColor" />
    </svg>
    <div>AI Assistant</div>
  </>
);

const AvatarDisplay = ({ isCallActive, sessionId, onAvatarReady }) => {
  const [avatarStatus, setAvatarStatus] = useState('idle');
  const [conversationUrl, setConversationUrl] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const previousCallActive = useRef(isCallActive);

  useEffect(() => {
    const wasCallActive = previousCallActive.current;
    previousCallActive.current = isCallActive;

    const apiKey = import.meta.env.VITE_TAVUS_API_KEY?.trim();
    const replicaId = import.meta.env.VITE_TAVUS_REPLICA_ID?.trim();

    const startConversation = async () => {
      setAvatarStatus('loading');
      setErrorMessage(null);

      if (!apiKey || !replicaId) {
        setAvatarStatus('error');
        setErrorMessage(ENV_ERROR_MESSAGE);
        return;
      }

      try {
        const conversation = await createConversation(apiKey, replicaId, sessionId);
        setConversationUrl(conversation.conversation_url ?? null);
        setConversationId(conversation.conversation_id ?? null);
      } catch (error) {
        setAvatarStatus('error');
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    if (isCallActive && sessionId && !wasCallActive) {
      startConversation();
      return;
    }

    if (!isCallActive && wasCallActive && conversationId) {
      if (apiKey) {
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

  const handleIframeLoad = () => {
    setAvatarStatus('ready');
    if (onAvatarReady) {
      onAvatarReady();
    }
  };

  const showPlaceholder =
    avatarStatus === 'idle' || avatarStatus === 'loading' || avatarStatus === 'error';
  const showHiddenIframe = avatarStatus === 'loading' && Boolean(conversationUrl);
  const showVisibleIframe = avatarStatus === 'ready' && Boolean(conversationUrl);

  return (
    <div className="avatar-display">
      {showPlaceholder && (
        <div className="avatar-placeholder">
          <PersonPlaceholder />
        </div>
      )}

      {avatarStatus === 'loading' && (
        <div className="avatar-loading-overlay">
          <div className="avatar-spinner" />
        </div>
      )}

      {avatarStatus === 'error' && (
        <div className="avatar-error-overlay">
          <div>{errorMessage || 'Unable to load avatar.'}</div>
          <button className="avatar-retry-btn" type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {(showHiddenIframe || showVisibleIframe) && (
        <iframe
          src={conversationUrl}
          allow="camera; microphone; fullscreen"
          title="Tavus AI Avatar"
          onLoad={handleIframeLoad}
          style={
            showHiddenIframe
              ? { opacity: 0, pointerEvents: 'none' }
              : { opacity: 1, pointerEvents: 'auto' }
          }
        />
      )}

      <style>{`
        .avatar-display {
          width: 100%;
          aspect-ratio: 9 / 16;
          background: #111118;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }

        @media (min-width: 768px) {
          .avatar-display {
            aspect-ratio: 16 / 9;
          }
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #666;
        }

        .avatar-placeholder svg {
          width: 64px;
          height: 64px;
          opacity: 0.4;
        }

        .avatar-display iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          position: relative;
          z-index: 1;
        }

        .avatar-loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          z-index: 3;
        }

        .avatar-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .avatar-error-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #ff6b6b;
          text-align: center;
          padding: 24px;
          z-index: 4;
        }

        .avatar-retry-btn {
          padding: 8px 20px;
          background: transparent;
          border: 1px solid #ff6b6b;
          color: #ff6b6b;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .avatar-retry-btn:hover {
          background: #ff6b6b;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default AvatarDisplay;

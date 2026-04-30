import { useEffect, useMemo, useRef, useState } from 'react';
import { checkHealth } from './api';
import useLiveKit from './hooks/useLiveKit';
import AvatarDisplay from './components/AvatarDisplay';
import ToolCallPanel from './components/ToolCallPanel';
import CallControls from './components/CallControls';
import CallSummary from './components/CallSummary';

const formatDuration = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

function App() {
  const [appView, setAppView] = useState('call');
  const [callerName, setCallerName] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [healthStatus, setHealthStatus] = useState('checking');
  const [callDuration, setCallDuration] = useState(0);
  const [dismissedError, setDismissedError] = useState(null);
  const transitionTimeoutRef = useRef(null);

  const {
    callStatus,
    isConnected,
    isMicActive,
    isAgentSpeaking,
    sessionId,
    error,
    toolEvents,
    startCall,
    endCall,
    toggleMic,
    clearError,
  } = useLiveKit({
    onToolEvent: () => {},
    onAgentSpeaking: () => {},
    onCallEnded: (endedSessionId) => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = setTimeout(() => {
        setSummaryData({
          sessionId: endedSessionId,
          phone: null,
        });
        setAppView('summary');
      }, 1500);
    },
  });

  useEffect(() => {
    let mounted = true;
    const loadHealth = async () => {
      const health = await checkHealth();
      if (!mounted) return;
      setHealthStatus(health.status === 'error' ? 'offline' : 'online');
    };
    loadHealth();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => {
      setDismissedError(error);
      clearError();
    }, 5000);
    return () => clearTimeout(timer);
  }, [clearError, error]);

  useEffect(() => {
    if (callStatus !== 'connected') return undefined;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const visibleError = useMemo(() => {
    if (!error || error === dismissedError) return null;
    return error;
  }, [dismissedError, error]);

  const backendLabel =
    healthStatus === 'checking'
      ? 'Backend checking'
      : healthStatus === 'online'
        ? 'Backend online'
        : 'Backend offline';

  if (appView === 'summary' && summaryData?.sessionId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-logo">
            <svg viewBox="0 0 32 18" aria-hidden="true">
              <circle cx="11" cy="9" r="6.5" />
              <circle cx="20" cy="9" r="6.5" />
            </svg>
            <span className="header-brand">Mykare Health</span>
          </div>
          <span className={`health-pill health-${healthStatus}`}>{backendLabel}</span>
        </header>
        <div className="summary-view">
          <CallSummary
            sessionId={summaryData.sessionId}
            phone={summaryData.phone}
            onClose={() => {
              setAppView('call');
              setSummaryData(null);
            }}
          />
        </div>
        <style>{`
          .app {
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: var(--color-bg-base);
            color: var(--color-text-primary);
            font-family: var(--font-sans);
            overflow: hidden;
          }
          .app-header {
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 var(--space-6);
            background: rgba(8, 8, 16, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--color-border);
            flex-shrink: 0;
            z-index: 10;
          }
          .header-logo {
            display: flex;
            align-items: center;
            gap: var(--space-3);
          }
          .header-logo svg {
            width: 32px;
            height: 18px;
            color: var(--color-accent);
            opacity: 0.9;
          }
          .header-brand {
            font-size: var(--text-lg);
            font-weight: var(--font-bold);
            color: var(--color-text-primary);
            letter-spacing: -0.4px;
          }
          .health-pill {
            border-radius: var(--radius-full);
            padding: var(--space-1) var(--space-3);
            font-size: var(--text-xs);
            border: 1px solid var(--color-border);
            color: var(--color-text-secondary);
            white-space: nowrap;
          }
          .health-online {
            color: var(--color-success);
            background: var(--color-success-bg);
            border-color: rgba(52, 211, 153, 0.3);
          }
          .health-offline {
            color: var(--color-error);
            background: var(--color-error-bg);
            border-color: rgba(248, 113, 113, 0.3);
          }
          .health-checking {
            color: var(--color-warning);
            background: var(--color-warning-bg);
            border-color: rgba(251, 191, 36, 0.3);
          }
          .summary-view {
            flex: 1;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: var(--space-8) var(--space-6);
            overflow-y: auto;
            animation: summary-fade var(--transition-slow);
          }
          @keyframes summary-fade {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-logo">
          <svg viewBox="0 0 32 18" aria-hidden="true">
            <circle cx="11" cy="9" r="6.5" />
            <circle cx="20" cy="9" r="6.5" />
          </svg>
          <span className="header-brand">Mykare Health</span>
        </div>
        <div className="header-right">
          <span className={`health-pill health-${healthStatus}`}>{backendLabel}</span>
          {(callStatus === 'connected' || callStatus === 'ending') && (
            <span className="call-timer">{formatDuration(callDuration)}</span>
          )}
        </div>
      </header>

      <div className={`error-banner-wrap ${visibleError ? 'visible' : ''}`}>
        {visibleError && (
          <div className="error-banner">
            <span>{visibleError}</span>
            <button
              type="button"
              className="error-dismiss"
              onClick={() => {
                setDismissedError(error);
                clearError();
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      <main
        className="app-main"
        data-caller-name={callerName || 'Patient'}
        data-agent-speaking={isAgentSpeaking ? 'true' : 'false'}
      >
        <section className="avatar-column">
          <AvatarDisplay
            isCallActive={callStatus === 'connected'}
            isAgentSpeaking={isAgentSpeaking}
            sessionId={sessionId}
            onAvatarReady={() => console.log('Avatar ready')}
          />
        </section>

        <aside className="panel-column">
          <ToolCallPanel toolEvents={toolEvents} isCallActive={isConnected} />
        </aside>
      </main>

      <footer className="app-footer">
        <div className="controls-wrapper">
          <CallControls
            callStatus={callStatus}
            isMicActive={isMicActive}
            onStartCall={(name) => {
              setCallerName(name || '');
              setCallDuration(0);
              startCall(name || 'Patient');
            }}
            onEndCall={async () => {
              setCallDuration(0);
              await endCall();
            }}
            onToggleMic={toggleMic}
          />
        </div>
      </footer>

      <style>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-base);
          color: var(--color-text-primary);
          font-family: var(--font-sans);
          overflow: hidden;
        }
        .app-header {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-6);
          background: rgba(8, 8, 16, 0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          z-index: 10;
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .header-logo svg {
          width: 32px;
          height: 18px;
          color: var(--color-accent);
          opacity: 0.9;
        }
        .header-brand {
          font-size: var(--text-lg);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          letter-spacing: -0.4px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .health-pill {
          border-radius: var(--radius-full);
          padding: var(--space-1) var(--space-3);
          font-size: var(--text-xs);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          white-space: nowrap;
        }
        .health-online {
          color: var(--color-success);
          background: var(--color-success-bg);
          border-color: rgba(52, 211, 153, 0.3);
        }
        .health-offline {
          color: var(--color-error);
          background: var(--color-error-bg);
          border-color: rgba(248, 113, 113, 0.3);
        }
        .health-checking {
          color: var(--color-warning);
          background: var(--color-warning-bg);
          border-color: rgba(251, 191, 36, 0.3);
        }
        .call-timer {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          font-variant-numeric: tabular-nums;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: var(--space-1) var(--space-3);
          font-family: var(--font-mono);
        }
        .error-banner-wrap {
          height: 0;
          overflow: hidden;
          transition: height var(--transition-base);
        }
        .error-banner-wrap.visible {
          height: 40px;
        }
        .error-banner {
          height: 40px;
          background: var(--color-error-bg);
          color: var(--color-error);
          border-bottom: 1px solid rgba(248, 113, 113, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--space-6);
          font-size: var(--text-sm);
        }
        .error-dismiss {
          background: none;
          border: 0;
          color: inherit;
          cursor: pointer;
          font-size: var(--text-lg);
          line-height: 1;
        }
        .app-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 340px;
          overflow: hidden;
        }
        .avatar-column {
          position: relative;
          overflow: hidden;
          background: var(--color-bg-base);
        }
        .panel-column {
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--color-border);
          background: var(--color-bg-surface);
          overflow: hidden;
        }
        .app-footer {
          flex-shrink: 0;
          background: rgba(8, 8, 16, 0.85);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--color-border);
          padding: var(--space-4) var(--space-6);
          display: flex;
          justify-content: center;
        }
        .controls-wrapper {
          width: 100%;
          max-width: 480px;
        }
        @media (max-width: 768px) {
          .app-main {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
          }
          .panel-column {
            border-left: none;
            border-top: 1px solid var(--color-border);
            max-height: 240px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;

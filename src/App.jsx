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

  if (appView === 'summary' && summaryData?.sessionId) {
    return (
      <div className="app">
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
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: #0a0a0f;
            color: #f0f0f0;
            font-family: system-ui, sans-serif;
          }
          .summary-view {
            flex: 1;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 32px 16px;
            overflow-y: auto;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">Mykare Health</div>
        <div className="header-right">
          {(callStatus === 'connected' || callStatus === 'ending') && (
            <span className="call-timer">{formatDuration(callDuration)}</span>
          )}
          <span className={`status-badge status-${healthStatus}`}>
            {healthStatus === 'checking' && 'Backend: Checking...'}
            {healthStatus === 'online' && 'Backend: Online ✅'}
            {healthStatus === 'offline' && 'Backend: Offline ❌'}
          </span>
        </div>
      </header>

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

      <main
        className="app-main"
        data-caller-name={callerName || 'Patient'}
        data-agent-speaking={isAgentSpeaking ? 'true' : 'false'}
      >
        <section className="avatar-column">
          <AvatarDisplay
            isCallActive={callStatus === 'connected'}
            sessionId={sessionId}
            onAvatarReady={() => console.log('Avatar ready')}
          />
        </section>

        <aside className="panel-column">
          <ToolCallPanel toolEvents={toolEvents} isCallActive={isConnected} />
        </aside>

        <footer className="app-footer">
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
        </footer>
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0f;
          color: #f0f0f0;
          font-family: system-ui, sans-serif;
        }
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #0f0f17;
          border-bottom: 1px solid #1a1a26;
          flex-shrink: 0;
        }
        .header-brand {
          font-size: 18px;
          font-weight: 700;
          color: #f0f0f0;
          letter-spacing: -0.3px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .status-badge {
          font-size: 13px;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: 500;
        }
        .status-online {
          background: #1a4a2a;
          color: #4aff8a;
        }
        .status-offline {
          background: #3a1a1a;
          color: #ff6b6b;
        }
        .status-checking {
          background: #2a2a2a;
          color: #888;
        }
        .call-timer {
          font-size: 14px;
          color: #888;
          font-variant-numeric: tabular-nums;
        }
        .app-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 16px;
          padding: 16px;
          overflow: hidden;
          grid-template-areas:
            "avatar panel"
            "footer footer";
          grid-template-rows: minmax(0, 1fr) auto;
        }
        .avatar-column {
          grid-area: avatar;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
          overflow: hidden;
        }
        .panel-column {
          grid-area: panel;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .app-footer {
          grid-area: footer;
          padding: 16px 24px;
          background: #0f0f17;
          border-top: 1px solid #1a1a26;
          flex-shrink: 0;
        }
        .error-banner {
          background: #3a1a1a;
          color: #ff9999;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          border-bottom: 1px solid #5a2a2a;
        }
        .error-dismiss {
          background: none;
          border: none;
          color: #ff9999;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0 4px;
        }
        .summary-view {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 32px 16px;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .app-main {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto 1fr;
            grid-template-areas:
              "avatar"
              "footer"
              "panel";
          }
          .panel-column {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;

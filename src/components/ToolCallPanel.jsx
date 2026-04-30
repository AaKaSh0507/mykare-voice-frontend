const TOOL_LABELS = {
  identify_user: 'Identifying User',
  fetch_slots: 'Fetching Slots',
  book_appointment: 'Booking Appointment',
  retrieve_appointments: 'Retrieving Appointments',
  cancel_appointment: 'Cancelling Appointment',
  modify_appointment: 'Modifying Appointment',
  end_conversation: 'Ending Conversation',
};

const formatToolName = (toolName = '') => {
  if (TOOL_LABELS[toolName]) return TOOL_LABELS[toolName];
  return toolName
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatTime = (iso = '') => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('en-US', { hour12: false });
};

const getStatusIcon = (status) => {
  if (status === 'in_progress') {
    return <span className="tool-spinner" aria-label="In progress" />;
  }
  if (status === 'error') return '❌';
  return '✅';
};

const getStatusLabel = (status) => {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'error') return 'Failed';
  return 'Completed';
};

const ToolCallPanel = ({ toolEvents = [], isCallActive = false }) => {
  const latestByTool = toolEvents.reduce((acc, event) => {
    const current = acc.get(event.tool);
    const currentTs = current ? new Date(current.timestamp).getTime() : -Infinity;
    const nextTs = new Date(event.timestamp).getTime();
    if (!current || nextTs >= currentTs) {
      acc.set(event.tool, event);
    }
    return acc;
  }, new Map());

  const displayEvents = Array.from(latestByTool.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const successfulCount = displayEvents.filter((event) => event.status === 'success').length;
  const runningCount = displayEvents.filter((event) => event.status === 'in_progress').length;
  const failedCount = displayEvents.filter((event) => event.status === 'error').length;

  const showIdle = !isCallActive && displayEvents.length === 0;
  const showWaiting = isCallActive && displayEvents.length === 0;

  return (
    <div className="tool-call-panel">
      <h3>Tool Activity</h3>
      <div className="activity-stats">
        <span>Done: {successfulCount}</span>
        <span>Running: {runningCount}</span>
        <span>Failed: {failedCount}</span>
      </div>

      {showIdle && (
        <div className="panel-empty">
          Tool activity will appear here during the call.
        </div>
      )}

      {showWaiting && <div className="panel-empty panel-waiting">Waiting for activity...</div>}

      {displayEvents.map((event) => (
        <article key={`${event.tool}-${event.timestamp}`} className={`tool-card ${event.status}`}>
          <div className="tool-card-icon">{getStatusIcon(event.status)}</div>
          <div className="tool-card-body">
            <div className="tool-card-title">{formatToolName(event.tool)}</div>
            <div className="tool-card-message">{event.message || 'No details provided.'}</div>
          </div>
          <div className={`tool-card-status-badge status-${event.status}`}>
            {getStatusLabel(event.status)}
          </div>
          <div className="tool-card-time">{formatTime(event.timestamp)}</div>
        </article>
      ))}

      <style>{`
        .tool-call-panel {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow-y: auto;
          background: var(--color-bg-surface);
        }
        .tool-call-panel h3 {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--color-text-muted);
          font-weight: var(--font-semibold);
          border-bottom: 1px solid var(--color-border-subtle);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 16px 8px;
        }
        .tool-call-panel h3::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${isCallActive ? 'var(--color-success)' : 'var(--color-text-muted)'};
          animation: ${isCallActive ? 'live-pulse 2s ease-in-out infinite' : 'none'};
          flex-shrink: 0;
        }
        .activity-stats {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 10px 12px 2px;
        }
        .activity-stats span {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 2px 8px;
        }
        .tool-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 8px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          transition: all var(--transition-base);
          animation: slide-in 0.2s ease;
        }
        .tool-card.success {
          border-color: rgba(52, 211, 153, 0.2);
          background: linear-gradient(135deg, var(--color-bg-elevated), rgba(52, 211, 153, 0.03));
        }
        .tool-card.error {
          border-color: rgba(248, 113, 113, 0.2);
          background: linear-gradient(135deg, var(--color-bg-elevated), rgba(248, 113, 113, 0.03));
        }
        .tool-card.in_progress {
          border-color: rgba(91, 110, 245, 0.3);
          background: linear-gradient(135deg, var(--color-bg-elevated), rgba(91, 110, 245, 0.05));
        }
        .tool-card-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .tool-card-body {
          flex: 1;
          min-width: 0;
        }
        .tool-card-title {
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tool-card-message {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          margin-top: 3px;
          line-height: var(--leading-normal);
        }
        .tool-card-time {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          flex-shrink: 0;
          margin-top: 2px;
        }
        .tool-card-status-badge {
          font-size: 10px;
          font-weight: 600;
          border-radius: 999px;
          padding: 3px 8px;
          margin-top: 1px;
          flex-shrink: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .tool-card-status-badge.status-success {
          background: var(--color-success-bg);
          color: var(--color-success);
        }
        .tool-card-status-badge.status-error {
          background: var(--color-error-bg);
          color: var(--color-error);
        }
        .tool-card-status-badge.status-in_progress {
          background: rgba(91, 110, 245, 0.18);
          color: #b8c5ff;
        }
        .tool-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #2a3a4a;
          border-top-color: #4a9eff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .panel-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          text-align: center;
          padding: 24px;
        }
        .panel-waiting {
          animation: pulse 1.2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slide-in {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ToolCallPanel;

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

  const showIdle = !isCallActive && displayEvents.length === 0;
  const showWaiting = isCallActive && displayEvents.length === 0;

  return (
    <div className="tool-call-panel">
      <h3>Tool Activity</h3>

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
          <div className="tool-card-time">{formatTime(event.timestamp)}</div>
        </article>
      ))}

      <style>{`
        .tool-call-panel {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
          padding: 16px;
          background: #0f0f17;
          border-radius: 12px;
        }
        .tool-call-panel h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #555;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .tool-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: #1a1a26;
          border: 1px solid #2a2a3a;
          transition: all 0.2s ease;
        }
        .tool-card.success {
          border-color: #1a4a2a;
        }
        .tool-card.error {
          border-color: #4a1a1a;
        }
        .tool-card.in_progress {
          border-color: #2a3a4a;
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
          font-size: 14px;
          font-weight: 600;
          color: #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tool-card-message {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
          line-height: 1.4;
        }
        .tool-card-time {
          font-size: 11px;
          color: #555;
          flex-shrink: 0;
          margin-top: 2px;
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
          color: #444;
          font-size: 13px;
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
      `}</style>
    </div>
  );
};

export default ToolCallPanel;

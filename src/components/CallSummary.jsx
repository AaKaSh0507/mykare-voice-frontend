import { useEffect, useMemo, useState } from 'react';
import { pollSummary } from '../api.js';

const INTENT_STYLES = {
  booking: { background: 'rgba(91, 110, 245, 0.2)', color: '#a8b3ff' },
  cancellation: { background: 'var(--color-error-bg)', color: 'var(--color-error)' },
  modification: { background: 'rgba(162, 109, 255, 0.18)', color: '#c8a7ff' },
  inquiry: { background: 'rgba(139, 139, 168, 0.16)', color: 'var(--color-text-secondary)' },
  escalation: { background: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

const getOrdinalSuffix = (day) => {
  const teen = day % 100;
  if (teen >= 11 && teen <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
};

const formatEndedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown end time';
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = getOrdinalSuffix(date.getDate());
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${weekday}, ${month} ${day} ${year} at ${time}`;
};

const formatAppointmentDate = (appointment) => {
  const source = appointment.datetime || appointment.date_time || appointment.start_time;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return appointment.message || 'Date unavailable';
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const CallSummary = ({ sessionId, phone, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [attemptCount, setAttemptCount] = useState(1);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      setLoading(true);
      setError(null);
      setSummary(null);

      try {
        const response = await pollSummary(sessionId, {
          maxAttempts: 10,
          intervalMs: 1000,
          onAttempt: (n) => {
            if (active) setAttemptCount(n);
          },
        });

        if (!active) return;
        setSummary(response.data || response);
      } catch (summaryError) {
        if (!active) return;
        setError(summaryError.message || 'Failed to generate summary');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSummary();

    return () => {
      active = false;
    };
  }, [sessionId, retryKey]);

  const intentStyle = useMemo(() => {
    const intent = summary?.intent || 'inquiry';
    return INTENT_STYLES[intent] || INTENT_STYLES.inquiry;
  }, [summary?.intent]);

  if (loading) {
    return (
      <div className="call-summary loading-state">
        <div className="summary-spinner" />
        <p>Generating summary... (attempt {attemptCount} of 10)</p>
        <style>{`
          .call-summary {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-6);
            padding: var(--space-8) var(--space-6);
          }
          .loading-state {
            align-items: center;
            justify-content: center;
            min-height: 320px;
            color: var(--color-text-secondary);
          }
          .summary-spinner {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-accent);
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="call-summary error-state">
        <div className="error-icon">❌</div>
        <p className="error-message">{error}</p>
        <button type="button" className="retry-btn" onClick={() => setRetryKey((prev) => prev + 1)}>
          Retry
        </button>
        <style>{`
          .call-summary {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-6);
            padding: var(--space-8) var(--space-6);
          }
          .error-state {
            align-items: center;
            justify-content: center;
            min-height: 320px;
            text-align: center;
          }
          .error-icon {
            font-size: 30px;
          }
          .error-message {
            color: var(--color-error);
          }
          .retry-btn {
            width: 100%;
            max-width: 280px;
            padding: 16px;
            background: var(--color-error-bg);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: var(--radius-md);
            color: var(--color-error);
            font-size: var(--text-base);
            font-weight: var(--font-semibold);
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  const appointments = Array.isArray(summary?.appointments) ? summary.appointments : [];
  const totalMessages = summary?.total_messages ?? 0;
  const summaryPhone = summary?.phone || phone || 'Unknown';
  const endedAt = formatEndedAt(summary?.ended_at);
  const intent = summary?.intent || 'inquiry';

  return (
    <div className="call-summary">
      <section className="summary-header">
        <div className="summary-checkmark">✓</div>
        <h2 className="summary-title">Call Complete</h2>
        <p className="summary-timestamp">{endedAt}</p>
      </section>

      <section>
        <span className="intent-badge" style={intentStyle}>
          {intent}
        </span>
      </section>

      <section className="appointments-section">
        <h3 className="section-title">Appointments This Call</h3>
        {appointments.length === 0 ? (
          <p className="empty-appts">No appointments were made during this call.</p>
        ) : (
          appointments.map((appointment, index) => (
            <article className="appointment-card" key={`${appointment.id || 'appt'}-${index}`}>
              <div className="appt-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="16" rx="2" stroke="#4a9eff" strokeWidth="2" />
                  <path d="M3 10h18" stroke="#4a9eff" strokeWidth="2" />
                  <path d="M8 3v4M16 3v4" stroke="#4a9eff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className="appt-details">
                <div className="appt-datetime">{formatAppointmentDate(appointment)}</div>
                <div className="appt-status">{appointment.status || 'confirmed'}</div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="stats-row">
        <div className="stat-item">
          <div className="stat-label">Total Messages</div>
          <div className="stat-value">{totalMessages}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Phone Number</div>
          <div className="stat-value">{summaryPhone}</div>
        </div>
      </section>

      <button type="button" className="new-call-btn" onClick={onClose}>
        Start New Call
      </button>

      <style>{`
        .call-summary {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          padding: var(--space-8) var(--space-6);
        }
        .summary-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }
        .summary-checkmark {
          width: 72px;
          height: 72px;
          background: var(--color-success-bg);
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 0 24px rgba(52, 211, 153, 0.15);
        }
        .summary-title {
          font-size: var(--text-2xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
        }
        .summary-timestamp {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
        .intent-badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: var(--font-semibold);
          text-transform: capitalize;
        }
        .appointments-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-title {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--color-text-muted);
          font-weight: var(--font-semibold);
          margin-bottom: var(--space-3);
        }
        .appointment-card {
          padding: var(--space-4);
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .appt-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          background: rgba(91, 110, 245, 0.16);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .appt-details {
          flex: 1;
        }
        .appt-datetime {
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          font-weight: var(--font-medium);
        }
        .appt-status {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          margin-top: 2px;
          text-transform: capitalize;
        }
        .empty-appts {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
        }
        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
        .stat-item {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          text-align: center;
        }
        .stat-label {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--color-text-muted);
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: var(--text-xl);
          font-weight: var(--font-bold);
          color: var(--color-text-primary);
          word-break: break-word;
        }
        .new-call-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, var(--color-accent), #7b5ea7);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: var(--text-base);
          font-weight: var(--font-semibold);
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: var(--shadow-accent);
        }
        .new-call-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 32px var(--color-accent-glow);
        }
      `}</style>
    </div>
  );
};

export default CallSummary;

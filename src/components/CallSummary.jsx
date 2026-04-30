import { useEffect, useMemo, useState } from 'react';
import { pollSummary } from '../api.js';

const INTENT_STYLES = {
  booking: { background: '#1a3a6a', color: '#4a9eff' },
  cancellation: { background: '#3a1a1a', color: '#ff6b6b' },
  modification: { background: '#2a1a4a', color: '#9a6aff' },
  inquiry: { background: '#2a2a2a', color: '#888' },
  escalation: { background: '#3a2a1a', color: '#ffaa6b' },
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
            max-width: 480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 32px 24px;
          }
          .loading-state {
            align-items: center;
            justify-content: center;
            min-height: 320px;
            color: #888;
          }
          .summary-spinner {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 3px solid #2a2a3a;
            border-top-color: #4a9eff;
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
            max-width: 480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding: 32px 24px;
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
            color: #ff6b6b;
          }
          .retry-btn {
            width: 100%;
            max-width: 280px;
            padding: 16px;
            background: transparent;
            border: 1px solid #ff6b6b;
            border-radius: 10px;
            color: #ff6b6b;
            font-size: 16px;
            font-weight: 600;
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
          max-width: 480px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 32px 24px;
        }
        .summary-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .summary-checkmark {
          width: 64px;
          height: 64px;
          background: #1a4a2a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        }
        .summary-title {
          font-size: 24px;
          font-weight: 700;
          color: #f0f0f0;
        }
        .summary-timestamp {
          font-size: 14px;
          color: #888;
        }
        .intent-badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .appointments-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-title {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #555;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .appointment-card {
          padding: 14px;
          background: #1a1a26;
          border-radius: 8px;
          border: 1px solid #2a2a3a;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .appt-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          background: #1a2a4a;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .appt-details {
          flex: 1;
        }
        .appt-datetime {
          font-size: 14px;
          color: #e0e0e0;
          font-weight: 500;
        }
        .appt-status {
          font-size: 12px;
          color: #888;
          margin-top: 2px;
          text-transform: capitalize;
        }
        .empty-appts {
          color: #888;
          font-size: 13px;
        }
        .stats-row {
          display: flex;
          gap: 16px;
        }
        .stat-item {
          flex: 1;
          background: #1a1a26;
          border-radius: 8px;
          padding: 14px;
          text-align: center;
        }
        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #555;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #e0e0e0;
          word-break: break-word;
        }
        .new-call-btn {
          width: 100%;
          padding: 16px;
          background: #4a9eff;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .new-call-btn:hover {
          background: #3a8eff;
        }
      `}</style>
    </div>
  );
};

export default CallSummary;

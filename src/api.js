/**
 * api.js — Single source of truth for all backend communication.
 *
 * No component should ever call fetch() or axios directly.
 * Everything goes through the functions exported from this module.
 */

import axios from 'axios';

// ─── Sleep helper ────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Axios Instance ──────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || '/api',
  timeout: 10_000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ────────────────────────────────────
// Logs every outgoing request at debug level
apiClient.interceptors.request.use(
  (config) => {
    const method = config.method ? config.method.toUpperCase() : 'GET';
    console.debug(`[API] ${method} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ───────────────────────────────────
// On success: unwraps response.data so callers get data directly
// On error: extracts the most useful error message and throws
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    throw new Error(message);
  },
);

// ─── Function 1: checkHealth() ──────────────────────────────
/**
 * GET /health
 * Returns the full health object from the backend.
 * Never throws — always returns something the UI can render.
 */
export async function checkHealth() {
  try {
    return await apiClient.get('/health');
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// ─── Function 2: getToken() ─────────────────────────────────
/**
 * POST /token
 * @param {string} participantName - Display name for the participant
 * @param {string} [roomName] - Optional room name (server generates one if omitted)
 * @returns {{ token: string, room_name: string, livekit_url: string }}
 * @throws {Error} on network or server error
 */
export async function getToken(participantName, roomName) {
  return apiClient.post('/token', {
    participant_name: participantName,
    room_name: roomName || undefined,
    participant_identity: crypto.randomUUID(),
  });
}

// ─── Function 3: startSession() ─────────────────────────────
/**
 * POST /session/start
 * @param {string} sessionId - Session identifier
 * @param {string} [phone] - Optional phone number
 * @returns {Object} The created call log object
 * @throws {Error} on network or server error
 */
export async function startSession(sessionId, phone) {
  return apiClient.post('/session/start', {
    session_id: sessionId,
    phone: phone || null,
  });
}

// ─── Function 4: getAppointments() ──────────────────────────
/**
 * GET /appointments/{phone}
 * @param {string} phone - Patient phone number
 * @returns {{ success: boolean, data: any, message: string }}
 * @throws {Error} on network or server error
 */
export async function getAppointments(phone) {
  return apiClient.get(`/appointments/${phone}`);
}

// ─── Function 5: getSummary() ───────────────────────────────
/**
 * GET /summary/{sessionId}
 * Returns the summary response object as-is.
 * Does NOT throw when success is false (e.g. session not found) —
 * only throws on actual network/HTTP errors.
 *
 * @param {string} sessionId
 * @returns {{ success: boolean, data: any, message: string }}
 * @throws {Error} on network or HTTP error only
 */
export async function getSummary(sessionId) {
  return apiClient.get(`/summary/${sessionId}`);
}

// ─── Function 6: pollSummary() ──────────────────────────────
/**
 * Smart polling wrapper around getSummary().
 * Retries until the backend returns success: true or maxAttempts is exhausted.
 *
 * @param {string} sessionId
 * @param {Object} [options]
 * @param {number} [options.maxAttempts=10] - Number of times to try
 * @param {number} [options.intervalMs=1000] - Milliseconds between attempts
 * @param {function} [options.onAttempt] - Callback(attemptNumber) called before each try
 * @returns {{ success: true, data: any, message: string }}
 * @throws {Error} after maxAttempts if summary never becomes available
 */
export async function pollSummary(sessionId, options = {}) {
  const {
    maxAttempts = 10,
    intervalMs = 1000,
    onAttempt,
  } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (typeof onAttempt === 'function') {
      onAttempt(attempt);
    }

    const result = await getSummary(sessionId);

    if (result.success) {
      return result;
    }

    // Don't sleep after the last attempt
    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  throw new Error(
    `Summary not available after ${maxAttempts} attempts. Please try again.`,
  );
}

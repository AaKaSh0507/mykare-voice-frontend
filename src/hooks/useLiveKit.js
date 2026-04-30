import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionState, Room, RoomEvent, Track } from 'livekit-client';
import { getToken, startSession } from '../api.js';

const initialStatus = 'idle';

/**
 * Manages the full LiveKit call lifecycle for the frontend.
 *
 * Returned state:
 * - callStatus: "idle" | "connecting" | "connected" | "ending" | "ended"
 * - isConnected: Whether the room is currently connected
 * - isMicActive: Whether local microphone publishing is currently enabled
 * - isAgentSpeaking: Whether an agent audio track is currently subscribed
 * - sessionId: Active session UUID for the current/last call
 * - roomName: Active LiveKit room name for the current call
 * - error: Last error message (or null)
 * - toolEvents: Ordered list of parsed tool events from data channel
 *
 * Returned actions:
 * - startCall(participantName): Creates a session, connects to room, enables mic
 * - endCall(): Disconnects room and transitions call to ended state
 * - toggleMic(): Toggles local participant microphone on/off
 */
const useLiveKit = (options = {}) => {
  const roomRef = useRef(null);
  const audioContextRef = useRef(null);
  const endCallRef = useRef(null);

  const [callStatus, setCallStatus] = useState(initialStatus);
  const [isConnected, setIsConnected] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [error, setError] = useState(null);
  const [toolEvents, setToolEvents] = useState([]);

  const endCall = useCallback(async () => {
    try {
      setCallStatus('ending');

      if (roomRef.current) {
        roomRef.current.disconnect();
      }

      if (audioContextRef.current?.state !== 'closed') {
        await audioContextRef.current?.close();
      }
      audioContextRef.current = null;
      roomRef.current = null;

      setIsConnected(false);
      setIsMicActive(false);
      setIsAgentSpeaking(false);
      setCallStatus('ended');
    } catch (endError) {
      console.error('[LiveKit] Failed to end call:', endError);
    }
  }, []);

  const startCall = useCallback(
    async (participantName) => {
      let room = null;
      const nextSessionId = crypto.randomUUID();

      try {
        setCallStatus('connecting');
        setError(null);
        setToolEvents(() => []);
        setSessionId(nextSessionId);

        const tokenResponse = await getToken(participantName);
        await startSession(nextSessionId, null);

        room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        room.on(RoomEvent.Connected, () => {
          const connected = room.state === ConnectionState.Connected;
          setCallStatus(connected ? 'connected' : 'connecting');
          setIsConnected(connected);
          setRoomName(room.name || tokenResponse.room_name || null);
        });

        room.on(RoomEvent.Disconnected, () => {
          setCallStatus('ended');
          setIsConnected(false);
          setIsMicActive(false);
          setIsAgentSpeaking(false);
          if (typeof options.onCallEnded === 'function') {
            options.onCallEnded(nextSessionId);
          }
        });

        room.on(RoomEvent.DataReceived, (payload) => {
          try {
            const text = new TextDecoder().decode(payload);
            const parsed = JSON.parse(text);
            if (parsed?.type === 'tool_event') {
              setToolEvents((prev) => [...prev, parsed]);

              if (typeof options.onToolEvent === 'function') {
                options.onToolEvent(parsed);
              }

              if (parsed.tool === 'end_conversation') {
                setCallStatus('ending');
                if (typeof options.onCallEnded === 'function') {
                  options.onCallEnded(nextSessionId);
                }
              }
            }
          } catch (parseError) {
            console.warn('[LiveKit] Failed to parse data payload:', parseError);
          }
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            if (!audioContextRef.current) {
              audioContextRef.current = new AudioContext();
            }
            const element = new Audio();
            track.attach(element);
            element.play().catch((playError) => {
              console.warn('[LiveKit] Audio playback failed:', playError);
            });
            setIsAgentSpeaking(true);
            if (typeof options.onAgentSpeaking === 'function') {
              options.onAgentSpeaking(true);
            }
          }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            setIsAgentSpeaking(false);
            if (typeof options.onAgentSpeaking === 'function') {
              options.onAgentSpeaking(false);
            }
          }
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.info('[LiveKit] Participant connected:', participant.identity);
        });

        const livekitUrl = tokenResponse.livekit_url || import.meta.env.VITE_LIVEKIT_URL;
        await room.connect(livekitUrl, tokenResponse.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicActive(true);

        roomRef.current = room;
      } catch (startError) {
        setCallStatus('idle');
        setError(startError?.message || 'Failed to start call');
        if (room) {
          room.disconnect();
        }
        roomRef.current = null;
      }
    },
    [options],
  );

  const toggleMic = useCallback(async () => {
    if (!isConnected || !roomRef.current) {
      return;
    }

    try {
      const nextMicState = !isMicActive;
      await roomRef.current.localParticipant.setMicrophoneEnabled(nextMicState);
      setIsMicActive((prev) => !prev);
    } catch (toggleError) {
      setError(toggleError?.message || 'Failed to toggle microphone');
    }
  }, [isConnected, isMicActive]);

  endCallRef.current = endCall;

  useEffect(() => {
    return () => {
      if (endCallRef.current) {
        endCallRef.current();
      }
    };
  }, []);

  return {
    callStatus,
    isConnected,
    isMicActive,
    isAgentSpeaking,
    sessionId,
    roomName,
    error,
    toolEvents,
    startCall,
    endCall,
    toggleMic,
  };
};

export default useLiveKit;

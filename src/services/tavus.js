const TAVUS_BASE_URL = 'https://tavusapi.com';

export const AVATAR_ENV_ERROR_MESSAGE =
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
      conversation_name: `mykare-${sessionId}`,
      properties: {
        max_call_duration: 1800,
        participant_left_timeout: 60,
        enable_recording: false,
        language: 'english',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavus API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log('Tavus conversation created:', data);
  return data;
}

export async function endConversation(apiKey, conversationId) {
  try {
    const response = await fetch(`${TAVUS_BASE_URL}/v2/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': apiKey },
    });

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

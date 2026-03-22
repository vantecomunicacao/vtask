const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const SERVER_SECRET = import.meta.env.VITE_SERVER_SECRET || '';

export async function callEmailApi(endpoint: string, body: object) {
  const res = await fetch(`${SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVER_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Erro de comunicação HTTP: ${res.status}`);
  }
  return res.json();
}

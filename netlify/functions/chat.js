import { createChatCompletion } from '../../api/chat.js';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Método no permitido.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'La solicitud no es válida.' }) };
  }

  const result = await createChatCompletion(body);
  return { statusCode: result.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.data) };
}
import { useEffect, useRef, useState } from 'react';
import { Box, Button, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import { useFinance } from '../context/FinanceContext.jsx';
import { loadState } from '../services/storageService.js';
import { buildFinanceChatFacts, getDeterministicFinanceReply, resolveFinanceChatPeriod } from '../utils/financeChatAnalysis.js';
import { ChatIcon, CloseIcon, SendIcon } from './AppIcons.jsx';

const greeting = {
  role: 'assistant',
  text: 'Hola, puedo ayudarte a entender tus ingresos, gastos, metas e inversiones.',
};

export default function FinanceChat() {
  const { state } = useFinance();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [messages, setMessages] = useState([greeting]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const dragRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastRequestRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    function keepPanelInBounds() {
      const panel = document.querySelector('[data-chat-panel]');
      if (!panel) return;
      const bounds = panel.getBoundingClientRect();
      setPosition((current) => {
        if (!current) return current;
        const left = Math.max(8, Math.min(window.innerWidth - bounds.width - 8, current.left));
        const top = Math.max(8, Math.min(window.innerHeight - bounds.height - 8, current.top));
        return left === current.left && top === current.top ? current : { left, top };
      });
    }

    window.addEventListener('resize', keepPanelInBounds);
    return () => window.removeEventListener('resize', keepPanelInBounds);
  }, []);

  function startDragging(event) {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.closest('[data-chat-panel]').getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: bounds.left, top: bounds.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(event) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const panel = document.querySelector('[data-chat-panel]');
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - bounds.width - 8, dragRef.current.left + event.clientX - dragRef.current.startX));
    const top = Math.max(8, Math.min(window.innerHeight - bounds.height - 8, dragRef.current.top + event.clientY - dragRef.current.startY));
    setPosition({ left, top });
  }

  function stopDragging(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function sendRequest(request) {
    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Netlify devolvió una página en vez de la respuesta del chat. Verifica que la función y sus redirecciones estén desplegadas.');
      }
      const result = await response.json();
      if (!response.ok) {
        const error = new Error(result.error || 'No se pudo obtener una respuesta.');
        error.retryable = result.retryable === true;
        throw error;
      }
      setMessages((current) => [...current, { role: 'assistant', text: result.reply }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        text: error.message || 'Ocurrió un error al conectar con Gemini.',
        isError: true,
        retryable: error.retryable === true,
      }]);
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    const userMessage = { role: 'user', text };
    const savedState = loadState(state);
    const referenceDate = new Date();
    const requestedPeriod = resolveFinanceChatPeriod(text, savedState.movements, referenceDate);
    const financialData = buildFinanceChatFacts(savedState, referenceDate, requestedPeriod, text);
    const verifiedAnalysis = getDeterministicFinanceReply(text, financialData);
    const conversation = [...messages.slice(1).filter((message) => !message.isError), userMessage]
      .map(({ role, text: messageText }) => ({ role, text: messageText }))
      .slice(-10);
    const request = { financialData, messages: conversation, verifiedAnalysis };

    lastRequestRef.current = request;
    setMessages((current) => [
      ...current.map((message) => (message.retryable ? { ...message, retryable: false } : message)),
      userMessage,
    ]);
    setDraft('');
    await sendRequest(request);
  }

  async function retryLastRequest() {
    if (sending || !lastRequestRef.current) return;
    setMessages((current) => current.map((message) => (message.retryable ? { ...message, retryable: false } : message)));
    await sendRequest(lastRequestRef.current);
  }

  return (
    <>
      {open && (
        <Paper
          data-chat-panel
          elevation={12}
          sx={{
            position: 'fixed',
            left: position ? position.left : 'auto',
            top: position ? position.top : 'auto',
            right: position ? 'auto' : { xs: 8, sm: 24 },
            bottom: position ? 'auto' : { xs: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', sm: 92 },
            zIndex: 1400,
            display: 'flex',
            flexDirection: 'column',
            width: { xs: 'calc(100vw - 16px)', sm: 380 },
            height: { xs: 'min(680px, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px))', sm: 'min(600px, calc(100dvh - 120px))' },
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <Box
              onPointerDown={startDragging}
              onPointerMove={drag}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              sx={{ flex: 1, minWidth: 0, cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
            >
              <Typography fontWeight={700}>Asistente financiero</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>Gemini · arrastra desde aquí</Typography>
            </Box>
            <Tooltip title="Cerrar chat">
              <IconButton aria-label="Cerrar chat" size="small" onClick={() => setOpen(false)} sx={{ color: 'inherit' }}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box aria-live="polite" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 1.5, sm: 2 } }}>
            {messages.map((message, index) => (
              <Box key={`${message.role}-${index}`} sx={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: message.role === 'user' ? 'primary.main' : 'action.hover', color: message.role === 'user' ? 'primary.contrastText' : 'text.primary', overflowWrap: 'anywhere' }}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>
                </Box>
                {message.retryable && (
                  <Button size="small" onClick={retryLastRequest} disabled={sending} sx={{ mt: 0.5 }}>
                    Reintentar
                  </Button>
                )}
              </Box>
            ))}
            {sending && <Typography variant="body2" color="text.secondary">Gemini está analizando tus datos...</Typography>}
            <div ref={messagesEndRef} />
          </Box>

          <Box component="form" onSubmit={sendMessage} sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                label="Escribe tu pregunta"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={sending}
              />
              <Tooltip title="Enviar mensaje">
                <span>
                  <IconButton type="submit" aria-label="Enviar mensaje" color="primary" disabled={sending || !draft.trim()}>
                    <SendIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Tus datos financieros se envían a Gemini para responder.
            </Typography>
          </Box>
        </Paper>
      )}

      {!open && (
        <Tooltip title="Abrir asistente financiero">
          <IconButton
            aria-label="Abrir asistente financiero"
            onClick={() => setOpen(true)}
            sx={{ position: 'fixed', right: { xs: 16, sm: 24 }, bottom: { xs: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', sm: 24 }, zIndex: 1401, width: { xs: 52, sm: 56 }, height: { xs: 52, sm: 56 }, bgcolor: 'primary.main', color: 'primary.contrastText', boxShadow: 6, '&:hover': { bgcolor: 'primary.dark' } }}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
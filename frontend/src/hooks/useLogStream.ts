/**
 * WebSocket hook for real-time log streaming.
 * TICK-009: Connects to /ws/logs/, maintains buffer of last 200 lines, auto-reconnects.
 */
import { useState, useEffect, useRef } from 'react';

interface LogMessage {
  type: 'history' | 'line' | 'error';
  lines?: string[];
  text?: string;
  message?: string;
}

interface UseLogStreamResult {
  lines: string[];
  connected: boolean;
  error: string | null;
}

const MAX_BUFFER_SIZE = 200;

export function useLogStream(): UseLogStreamResult {
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const connect = () => {
      try {
        // Use relative WebSocket URL so Vite proxy handles it
        // In dev: ws://localhost:5173/ws/logs/ -> proxied to ws://127.0.0.1:8000/ws/logs/
        // In prod: ws://[actual-host]/ws/logs/
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/logs/`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message: LogMessage = JSON.parse(event.data);

            if (message.type === 'history') {
              // Initial history - replace buffer
              setLines(message.lines || []);
            } else if (message.type === 'line') {
              // New line - append to buffer, trim if needed
              setLines((prev) => {
                const newLines = [...prev, message.text || ''];
                return newLines.slice(-MAX_BUFFER_SIZE);
              });
            } else if (message.type === 'error') {
              setError(message.message || 'Unknown error');
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (event) => {
          console.error('WebSocket error:', event);
          setError('Connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setConnected(false);
          wsRef.current = null;

          // Auto-reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log(`Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay);
        };
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setError('Failed to create connection');
      }
    };

    // Initial connection
    connect();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { lines, connected, error };
}

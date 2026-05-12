import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (roomId: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws.current = new WebSocket(`${protocol}://${window.location.host}`);

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ type: 'join', roomId }));
    };

    ws.current.onmessage = (event) => {
      setLastMessage(JSON.parse(event.data));
    };

    return () => {
      ws.current?.close();
    };
  }, [roomId]);

  const send = (data: any) => {
    ws.current?.send(JSON.stringify(data));
  };

  return { lastMessage, send };
};

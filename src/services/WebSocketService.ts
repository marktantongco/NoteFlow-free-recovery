class WebSocketService {
    private ws: WebSocket | null = null;
    private listeners: ((data: any) => void)[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            this.ws = new WebSocket(`${protocol}://${window.location.host}`);
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.listeners.forEach(listener => listener(data));
            };
        }
    }

    send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    addListener(listener: (data: any) => void) {
        this.listeners.push(listener);
    }
}

export const webSocketService = new WebSocketService();

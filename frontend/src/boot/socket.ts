import { boot } from 'quasar/wrappers';
import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  const apiRoot = import.meta.env.VITE_WS_URL?.trim() || import.meta.env.VITE_API_URL?.trim() || '';
  const baseUrl = apiRoot || window.location.origin;

  socket = io(`${baseUrl}/events`, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export default boot(() => {
  // Socket se conecta tras login desde auth store
});

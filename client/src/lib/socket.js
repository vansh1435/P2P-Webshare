import { io } from "socket.io-client";

export function getSignalingUrl() {
  if (import.meta.env.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }

  if (window.location.port === "5173") {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return window.location.origin;
}

export function createSocket() {
  return io(getSignalingUrl(), {
    autoConnect: false,
    transports: ["websocket", "polling"]
  });
}

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:5000", {
      transports: ["polling"],   // keep reliable for now
      upgrade: false
    });
  }
  return socket;
}

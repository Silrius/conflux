// server/src/index.ts
import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { Server } from "socket.io";

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, name: "conflux-server" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
  // Polling-only is more reliable on networks/browsers where WS is blocked.
  transports: ["polling"],
});

type ClientToServerEvents = {
  "chat:message": (
    payload: { text: string },
    ack?: (response: { ok: boolean; msgId: string }) => void
  ) => void;
};

type ServerToClientEvents = {
  "chat:message": (msg: { id: string; createdAt: string; text: string }) => void;
};

type InterServerEvents = Record<string, never>;
type SocketData = Record<string, never>;

io.on(
  "connection",
  (
    socket: import("socket.io").Socket<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >
  ) => {
    console.log("socket connected:", socket.id);

    socket.on("chat:message", (payload, ack) => {
      console.log("chat:message", payload);

      const msg = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        text: payload.text,
      };

      io.emit("chat:message", msg);

      if (ack) ack({ ok: true, msgId: msg.id });
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  }
);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

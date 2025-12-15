import { useEffect, useMemo, useState } from "react";
import { getSocket } from "./shared/socket";

type ChatMessage = {
  id: string;
  createdAt: string;
  text: string;
};

export default function App() {
  const socket = useMemo(() => getSocket(), []);

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat:message", onMessage);

    return () => {
      // IMPORTANT: don't disconnect the singleton socket (StrictMode mounts/unmounts twice in dev)
      socket.off("chat:message", onMessage);
    };
  }, [socket]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 700, margin: "0 auto" }}>
      <h1>Conflux</h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          height: 300,
          overflow: "auto"
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ padding: "6px 0" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(m.createdAt).toLocaleTimeString()}
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;

          socket.emit("chat:message", { text });
          setText("");
        }}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 8 }}>
          Send
        </button>
      </form>
    </div>
  );
}

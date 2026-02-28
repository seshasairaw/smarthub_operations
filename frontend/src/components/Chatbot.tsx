import { useState } from "react";
import { Button, Input } from "antd";

type Message = {
    id: number;
    sender: "user" | "ai";
    text: string;
};

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: "ai",
            text: "Hi! Ask me about exceptions, vendors, or shipment status.",
        },
    ]);

    const [inputValue, setInputValue] = useState("");

    async function handleSend() {
    if (!inputValue.trim()) return;

    const currentInput = inputValue;

    const userMessage: Message = {
        id: messages.length + 1,
        sender: "user",
        text: currentInput,
    };

    const thinkingId = messages.length + 2;
    const thinkingMessage: Message = {
        id: thinkingId,
        sender: "ai",
        text: "Thinking...",
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    setInputValue("");

    try {
        const chatbotUrl = import.meta.env.VITE_CHATBOT_URL || "http://localhost:8001";
        const res = await fetch(`${chatbotUrl}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: currentInput,
                history: messages
                .filter((m) => 
                    m.text !== "Thinking..." && 
                    m.id !== 1 &&
                    m.text !== "Could not reach AI service. Is botbrain running on port 8001?"
                )
                .map((m) => ({
                    role: m.sender === "user" ? "user" : "assistant",
                    content: m.text,
                })),
            }),
        });

        const data = await res.json();

        setMessages((prev) =>
            prev.map((m) =>
                m.id === thinkingId ? { ...m, text: data.reply } : m
            )
        );

    } catch (err) {
        setMessages((prev) =>
            prev.map((m) =>
                m.id === thinkingId
                    ? { ...m, text: "Could not reach AI service. Is botbrain running on port 8001?" }
                    : m
            )
        );
    }
}

    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
            
            {/* Chat Panel - only shown when isOpen is true */}
            {isOpen && (
                <div style={{
                    width: 340,
                    height: 420,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                    display: "flex",
                    flexDirection: "column",
                    marginBottom: 12,
                    overflow: "hidden",
                }}>
                    {/* Header bar */}
                    <div style={{
                        background: "#1677ff",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}>
                        <div>
                            <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>
                                AI Command Center
                            </div>
                            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                                Ask me anything about operations
                            </div>
                        </div>
                        {/* Close button */}
                        <span
                            onClick={() => setIsOpen(false)}
                            style={{ color: "#fff", cursor: "pointer", fontSize: 16 }}
                        >
                            ✕
                        </span>
                    </div>

                    {/* Messages area - scrollable */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                    }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                                    background: msg.sender === "user" ? "#1677ff" : "#f0f0f0",
                                    color: msg.sender === "user" ? "#fff" : "#000",
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    maxWidth: "80%",
                                    fontSize: 13,
                                }}
                            >
                                {msg.text}
                            </div>
                        ))}
                    </div>

                    {/* Input area at the bottom */}
                    <div style={{
                        padding: "8px 12px",
                        borderTop: "1px solid #f0f0f0",
                        display: "flex",
                        gap: 8,
                    }}>
                        <Input
                            placeholder="Ask me anything..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            // allows sending with Enter key
                            onPressEnter={handleSend}
                            size="small"
                        />
                        <Button type="primary" size="small" onClick={handleSend}>
                            Send
                        </Button>
                    </div>
                </div>
            )}

            {/* The floating bubble button - toggles the chat open/closed */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                    type="primary"
                    shape="round"
                    size="large"
                    onClick={() => setIsOpen((prev) => !prev)}
                    style={{ boxShadow: "0 4px 16px rgba(22,119,255,0.4)" }}
                >
                    {isOpen ? "✕ Close" : "🤖 Ask Ops AI"}
                </Button>
            </div>
        </div>
    );
}
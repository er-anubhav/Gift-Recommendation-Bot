"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  chips?: string[];
}

const formatText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <strong key={idx}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session ID and load history on component mount
  useEffect(() => {
    const initializeSession = async () => {
      // Try to get existing session ID from localStorage
      let savedSessionId = localStorage.getItem("chatSessionId");
      
      if (!savedSessionId) {
        // Create new session if none exists
        savedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("chatSessionId", savedSessionId);
      }
      
      setSessionId(savedSessionId);
      
      // Load chat history from Supabase
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", savedSessionId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error loading chat history:", error);
          return;
        }

        if (data && data.length > 0) {
          const loadedMessages: Message[] = data.map((msg: any) => ({
            id: msg.id,
            text: msg.content,
            sender: msg.role === "user" ? "user" : "bot",
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    initializeSession();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput("");
    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_Backend_URL;
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply || data.message || JSON.stringify(data),
          sender: "bot",
          timestamp: new Date(),
          chips: data.chips || [],
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Error: ${response.statusText}`,
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (confirm("Are you sure you want to clear the chat history and start a new conversation?")) {
      // Clear messages
      setMessages([]);
      setInput("");
      
      // Create new session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem("chatSessionId", newSessionId);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur-sm px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Chat Assistant
            </h1>
            <p className="text-sm text-gray-500 mt-1">Powered by AI</p>
          </div>
          <button
            onClick={handleClearChat}
            className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            title="Clear chat history and start a new conversation"
          >
            Clear Chat
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-400 text-lg">Start a conversation...</p>
              <p className="text-gray-300 text-sm mt-2">Type a message to begin</p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col gap-2">
              <div
                className={`max-w-2xl px-5 py-3 rounded-2xl shadow-sm ${
                  msg.sender === "user"
                    ? "bg-linear-to-r from-blue-500 to-indigo-600 text-white rounded-br-none"
                    : "bg-white text-gray-800 rounded-bl-none border border-blue-100 shadow-md"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {formatText(msg.text)}
                </p>
                <span className={`text-xs mt-2 block ${msg.sender === "user" ? "text-blue-100" : "text-gray-400"}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {msg.chips && msg.chips.length > 0 && (
                <div className="flex flex-wrap gap-2 ml-0">
                  {msg.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(chip)}
                      className="px-3 py-1 text-sm bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-gray-700 rounded-full border border-blue-200 transition-all hover:shadow-md"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 px-5 py-3 rounded-2xl rounded-bl-none border border-blue-200 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
                <span className="text-sm font-medium text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-blue-100 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here..."
            rows={2}
            disabled={loading}
            className="flex-1 p-4 border border-blue-200 rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 shadow-sm transition-all"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg self-end disabled:shadow-none"
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>
      </footer>
    </div>
  );
}

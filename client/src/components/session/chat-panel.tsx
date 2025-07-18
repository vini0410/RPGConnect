import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  ws: WebSocket | null;
  userName: string;
}

export function ChatPanel({ ws, userName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat_message") {
        const message: ChatMessage = {
          id: Date.now().toString(),
          sender: data.sender,
          content: data.message,
          timestamp: new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
        };
        setMessages(prev => [...prev, message]);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(JSON.stringify({
      type: "chat_message",
      message: newMessage,
      sender: userName,
    }));

    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex items-start space-x-2">
                <span className="text-blue-400 text-sm font-semibold min-w-0">
                  {message.sender}:
                </span>
                <span className="text-gray-300 text-sm flex-1">
                  {message.content}
                </span>
                <span className="text-gray-500 text-xs flex-shrink-0">
                  {message.timestamp}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-900 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-blue-600 hover:bg-purple-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

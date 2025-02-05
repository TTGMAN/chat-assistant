import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  text: string;
  isBot: boolean;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi! How can I help you today?", isBot: true },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { text: input, isBot: false }]);
    setInput("");

    // Simulate bot response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Thanks for your message! I'll get back to you soon.", isBot: true },
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Chat Widget */}
      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 transition-all duration-300 ease-in-out",
          isOpen ? "w-[380px] h-[600px]" : "w-14 h-14"
        )}
      >
        {/* Main Chat Container */}
        <div
          className={cn(
            "bg-white rounded-2xl shadow-xl transition-all duration-300 ease-in-out overflow-hidden",
            isOpen
              ? "w-full h-full flex flex-col"
              : "w-14 h-14 cursor-pointer hover:scale-110",
            "border border-gray-200"
          )}
        >
          {isOpen ? (
            <>
              {/* Header */}
              <div className="p-4 bg-blue-500 text-white flex justify-between items-center">
                <h3 className="font-semibold">Chat Support</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-white hover:bg-blue-600"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg.text} isBot={msg.isBot} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="w-full h-full rounded-full bg-blue-500 hover:bg-blue-600"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { TypingIndicator } from "./TypingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi! I can help you book an appointment. Would you like to schedule one?", isBot: true, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [bookingState, setBookingState] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowWidth = window.innerWidth;
      const scrollThreshold = windowWidth * 0.5;

      if (scrollPosition > scrollThreshold && !showGreeting && !isOpen) {
        setShowGreeting(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showGreeting, isOpen]);

  const calculateDelay = (text: string) => {
    const baseDelay = 500;
    const characterDelay = Math.min(text.length * 20, 2000);
    return baseDelay + characterDelay;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, isBot: false, timestamp: new Date() }]);
    setInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: userMessage,
          state: bookingState,
          messages: messages.map(m => ({
            text: m.text,
            isBot: m.isBot,
            timestamp: m.timestamp.toISOString()
          }))
        },
      });

      if (error) throw error;

      const delay = calculateDelay(data.reply);
      await new Promise(resolve => setTimeout(resolve, delay));

      setIsTyping(false);
      setMessages((prev) => [...prev, { text: data.reply, isBot: true, timestamp: new Date() }]);
      setBookingState(data.state);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { 
          text: "Sorry, I'm having trouble responding right now. Please try again later.", 
          isBot: true, 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    setIsOpen(true);
    setShowGreeting(false);
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-5 right-5 z-50 transition-all duration-300 ease-in-out",
          isOpen ? "w-[380px] h-[600px]" : "w-14 h-14"
        )}
      >
        {showGreeting && !isOpen && (
          <div className="absolute bottom-20 right-0 bg-white p-4 rounded-lg shadow-lg border border-gray-200 mb-2 w-64">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm">Would you like to book an appointment?</p>
              <button
                onClick={() => setShowGreeting(false)}
                className="text-gray-400 hover:text-gray-600 -mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Button 
              onClick={handleStartChat}
              variant="default" 
              className="w-full mt-2"
            >
              Start Chat
            </Button>
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45 border-r border-b border-gray-200"></div>
          </div>
        )}

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
              <div className="p-4 bg-blue-500 text-white flex justify-between items-center">
                <h3 className="font-semibold">Booking Assistant</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-white hover:bg-blue-600"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <ChatMessage 
                    key={idx} 
                    message={msg.text} 
                    isBot={msg.isBot} 
                    timestamp={msg.timestamp}
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200 flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSend} 
                  size="icon"
                  disabled={isLoading}
                >
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

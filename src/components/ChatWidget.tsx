
import React, { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ChatGreeting } from "./chat/ChatGreeting";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { Message, ChatState } from "./chat/types";

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hi! I can help you book an appointment. Would you like to schedule one?", isBot: true, timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [bookingState, setBookingState] = useState<ChatState | null>(null);

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
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-[380px] h-[600px]" : "w-14 h-14"
      )}
    >
      {showGreeting && !isOpen && (
        <ChatGreeting 
          onStart={handleStartChat}
          onClose={() => setShowGreeting(false)}
        />
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
            <ChatHeader onClose={() => setIsOpen(false)} />
            <ChatMessages messages={messages} isTyping={isTyping} />
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              disabled={isLoading}
            />
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
  );
};

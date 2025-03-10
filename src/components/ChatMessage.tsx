
import React from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatMessage = ({ message, isBot, timestamp }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-2 animate-[slideIn_0.3s_ease-out] origin-bottom relative",
          isBot ? "bg-gray-100 text-gray-800" : "bg-blue-500 text-white"
        )}
        style={{
          animation: "scaleIn 0.3s ease-out"
        }}
      >
        {message.split('\n').map((text, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {text}
          </p>
        ))}
        <div className={cn(
          "text-xs mt-1 opacity-70",
          isBot ? "text-gray-600" : "text-white"
        )}>
          {format(timestamp, 'HH:mm')}
        </div>
      </div>
    </div>
  );
};

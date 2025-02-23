
import React from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
}

export const ChatMessage = ({ message, isBot }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "rounded-2xl px-4 py-2 animate-[slideIn_0.3s_ease-out] origin-bottom",
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
      </div>
    </div>
  );
};

// Add the animation to index.css

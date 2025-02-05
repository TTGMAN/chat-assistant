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
          "max-w-[80%] rounded-2xl px-4 py-2",
          isBot
            ? "bg-gray-100 text-gray-800"
            : "bg-blue-500 text-white"
        )}
      >
        {message}
      </div>
    </div>
  );
};
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
}

export const ChatMessage = ({ message, isBot }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "relative max-w-[80%] rounded-lg p-3",
        isBot
          ? "bg-white text-gray-900 ml-2"
          : "bg-blue-500 text-white ml-auto mr-2"
      )}
    >
      {/* Message content */}
      <div className="relative z-10">{message}</div>

      {/* Triangle pointer */}
      <div
        className={cn(
          "absolute w-0 h-0 border-8",
          isBot
            ? "border-l-white -right-4 top-4 border-t-transparent border-r-transparent border-b-transparent"
            : "border-r-blue-500 -left-4 top-4 border-t-transparent border-l-transparent border-b-transparent"
        )}
      />
    </div>
  );
};
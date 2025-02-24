
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
}

export const ChatInput = ({ value, onChange, onSend, disabled }: ChatInputProps) => {
  return (
    <div className="p-4 border-t border-gray-200 flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
        onKeyPress={(e) => e.key === "Enter" && onSend()}
        disabled={disabled}
      />
      <Button 
        onClick={onSend} 
        size="icon"
        disabled={disabled}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};

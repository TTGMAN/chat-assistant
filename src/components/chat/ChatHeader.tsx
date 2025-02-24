
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  onClose: () => void;
}

export const ChatHeader = ({ onClose }: ChatHeaderProps) => {
  return (
    <div className="p-4 bg-blue-500 text-white flex justify-between items-center">
      <h3 className="font-semibold">Booking Assistant</h3>
      <Button
        variant="ghost"
        size="icon"
        className="text-white hover:text-white hover:bg-blue-600"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
};

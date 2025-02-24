
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatGreetingProps {
  onStart: () => void;
  onClose: () => void;
}

export const ChatGreeting = ({ onStart, onClose }: ChatGreetingProps) => {
  return (
    <div className="absolute bottom-20 right-0 bg-white p-4 rounded-lg shadow-lg border border-gray-200 mb-2 w-64">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm">Would you like to book an appointment?</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 -mt-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button 
        onClick={onStart}
        variant="default" 
        className="w-full mt-2"
      >
        Start Chat
      </Button>
      <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white transform rotate-45 border-r border-b border-gray-200"></div>
    </div>
  );
};

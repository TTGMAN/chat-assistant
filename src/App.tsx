
import { ChatWidget } from "./components/ChatWidget";
import { ScrollPrompt } from "./components/ScrollPrompt";
import { CalendarBooking } from "./components/CalendarBooking";
import { useState } from "react";

const App = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-[200vh]">
      <ChatWidget />
      <ScrollPrompt onOpenChat={() => setIsChatOpen(true)} />
      
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold mb-4">Welcome to Our Site</h1>
        <p className="text-gray-600 mb-8">Book your appointment below!</p>
        
        <CalendarBooking />
      </div>
    </div>
  );
};

export default App;


export interface Message {
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export interface ChatState {
  step: string;
  customerName?: string;
  email?: string;
  date?: string;
  time?: string;
  availableSlots?: string[];
}

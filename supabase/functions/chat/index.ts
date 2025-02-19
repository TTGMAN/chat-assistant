
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse, addDays, isValid, parseISO, set, format } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingState {
  step: 'initial' | 'date' | 'time' | 'title' | 'email' | 'confirm';
  date?: string; // Changed from Date to string
  time?: string;
  title?: string;
  email?: string;
}

serve(async (req) => {
  console.log('Received request:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    let body;
    try {
      body = await req.json();
      console.log('Parsed request body:', body);
    } catch (e) {
      console.error('JSON parsing error:', e);
      throw new Error('Invalid JSON payload');
    }

    const { message, state } = body;

    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing message:', message, 'Current state:', state);

    let bookingState: BookingState = state || { step: 'initial' };
    let reply = '';

    switch (bookingState.step) {
      case 'initial':
        if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('book') || message.toLowerCase().includes('appointment')) {
          reply = "Great! Let's schedule your appointment. What date would you like to book? (e.g., tomorrow, next Monday, or MM/DD/YYYY)";
          bookingState.step = 'date';
        } else {
          reply = "I can help you book an appointment. Would you like to schedule one?";
        }
        break;

      case 'date':
        let parsedDate: Date | undefined;
        
        try {
          if (message.toLowerCase().includes('tomorrow')) {
            parsedDate = addDays(new Date(), 1);
          } else if (message.toLowerCase().includes('next')) {
            parsedDate = addDays(new Date(), 7);
          } else {
            parsedDate = parse(message, 'MM/dd/yyyy', new Date());
          }
        } catch (e) {
          console.error('Date parsing error:', e);
          parsedDate = undefined;
        }

        if (parsedDate && isValid(parsedDate)) {
          // Store date as ISO string
          bookingState.date = parsedDate.toISOString();
          reply = `Perfect! I can offer these time slots on ${format(parsedDate, 'MM/dd/yyyy')}: 09:00, 10:00, 11:00, 13:00, 14:00, 15:00, 16:00. Which time works best for you?`;
          bookingState.step = 'time';
        } else {
          reply = "I couldn't understand that date. Please provide a date in MM/DD/YYYY format, or say 'tomorrow' or 'next week'.";
        }
        break;

      case 'time':
        const availableSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
        const selectedTime = availableSlots.find(slot => message.includes(slot));
        
        if (selectedTime) {
          bookingState.time = selectedTime;
          reply = "Great choice! Please provide a brief title for your appointment.";
          bookingState.step = 'title';
        } else {
          reply = `Please select from these available times: ${availableSlots.join(', ')}`;
        }
        break;

      case 'title':
        bookingState.title = message;
        reply = "Almost done! Please provide your email address for confirmation.";
        bookingState.step = 'email';
        break;

      case 'email':
        if (message.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          bookingState.email = message;
          const bookingDate = parseISO(bookingState.date!);
          reply = `Great! Let me confirm your booking:\nDate: ${format(bookingDate, 'MM/dd/yyyy')}\nTime: ${bookingState.time}\nTitle: ${bookingState.title}\nEmail: ${bookingState.email}\n\nWould you like me to confirm this booking? (Yes/No)`;
          bookingState.step = 'confirm';
        } else {
          reply = "That doesn't look like a valid email address. Please try again.";
        }
        break;

      case 'confirm':
        if (message.toLowerCase().includes('yes')) {
          try {
            if (!bookingState.date || !bookingState.time) {
              throw new Error('Missing booking details');
            }

            const bookingDate = parseISO(bookingState.date);
            const [hours, minutes] = bookingState.time.split(':');
            const startTime = set(bookingDate, {
              hours: parseInt(hours),
              minutes: parseInt(minutes),
              seconds: 0,
              milliseconds: 0
            });
            
            const endTime = set(bookingDate, {
              hours: parseInt(hours) + 1,
              minutes: parseInt(minutes),
              seconds: 0,
              milliseconds: 0
            });

            const { data, error } = await supabase
              .from('calendar_bookings')
              .insert([
                {
                  title: bookingState.title,
                  start_time: startTime.toISOString(),
                  end_time: endTime.toISOString(),
                  booker_email: bookingState.email,
                }
              ]);

            if (error) {
              console.error('Supabase error:', error);
              throw error;
            }

            console.log('Booking created:', data);
            reply = "Perfect! Your appointment has been booked. You'll receive a confirmation email shortly. Is there anything else I can help you with?";
            bookingState = { step: 'initial' };
          } catch (error) {
            console.error('Booking error:', error);
            reply = "I'm sorry, there was an error creating your booking. Please try again.";
          }
        } else {
          reply = "No problem! Let's start over. What date would you like to book?";
          bookingState = { step: 'date' };
        }
        break;

      default:
        reply = "I can help you book an appointment. Would you like to schedule one?";
        bookingState = { step: 'initial' };
    }

    console.log('Sending response:', { reply, state: bookingState });

    return new Response(
      JSON.stringify({ 
        reply,
        state: bookingState
      }), 
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred while processing your request'
      }), 
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse, addDays, isValid, parseISO, set, format, isBefore, isToday } from "https://esm.sh/date-fns@2.30.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface BookingState {
  step: 'initial' | 'date' | 'time' | 'title' | 'email' | 'confirm';
  date?: string;
  time?: string;
  title?: string;
  email?: string;
}

// Helper function to validate if a time slot is available
const isTimeSlotAvailable = (date: Date, hour: number): boolean => {
  const now = new Date();
  const slotTime = set(date, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
  
  if (isToday(date)) {
    return !isBefore(slotTime, now);
  }
  
  return true;
}

// Helper function to format hour to time string
const formatTimeSlot = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
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
          if (isBefore(parsedDate, new Date()) && !isToday(parsedDate)) {
            reply = "Sorry, you can't book appointments in the past. Please choose a future date.";
            break;
          }

          bookingState.date = parsedDate.toISOString();
          
          const hours = [9, 10, 11, 13, 14, 15, 16];
          const availableSlots = hours
            .filter(hour => isTimeSlotAvailable(parsedDate!, hour))
            .map(hour => formatTimeSlot(hour));

          if (availableSlots.length === 0) {
            reply = "Sorry, there are no available time slots for this date. Please choose another date.";
            break;
          }

          reply = `Perfect! I can offer these time slots on ${format(parsedDate, 'MM/dd/yyyy')}: ${availableSlots.map(slot => slot.split(':')[0]).join(', ')}. Which hour works best for you?`;
          bookingState.step = 'time';
        } else {
          reply = "I couldn't understand that date. Please provide a date in MM/DD/YYYY format, or say 'tomorrow' or 'next week'.";
        }
        break;

      case 'time':
        const timeInput = message.trim().replace(/[^\d]/g, '');
        const hour = parseInt(timeInput);
        const availableHours = [9, 10, 11, 13, 14, 15, 16];
        
        if (availableHours.includes(hour)) {
          const timeSlot = formatTimeSlot(hour);
          const bookingDate = parseISO(bookingState.date!);
          
          if (!isTimeSlotAvailable(bookingDate, hour)) {
            reply = "Sorry, this time slot is no longer available. Please choose another time.";
            break;
          }
          
          bookingState.time = timeSlot;
          reply = "Great choice! Please provide a brief title for your appointment.";
          bookingState.step = 'title';
        } else {
          reply = `Please select from these available hours: ${availableHours.join(', ')}`;
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
            if (!bookingState.date || !bookingState.time || !bookingState.title || !bookingState.email) {
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

            const bookingData = {
              title: bookingState.title,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              booker_email: bookingState.email,
              status: 'pending'
            };

            // First check if the slot is already booked
            const { data: existingBookings, error: checkError } = await supabase
              .from('calendar_bookings')
              .select('*')
              .eq('start_time', startTime.toISOString())
              .eq('end_time', endTime.toISOString());

            if (checkError) {
              console.error('Error checking existing bookings:', checkError);
              throw checkError;
            }

            if (existingBookings && existingBookings.length > 0) {
              console.log('Time slot already booked:', existingBookings);
              reply = "I'm sorry, but this time slot has just been taken. Please choose another time.";
              bookingState.step = 'time';
              break;
            }

            // Insert the new booking
            const { data, error } = await supabase
              .from('calendar_bookings')
              .insert([bookingData])
              .select();

            if (error) {
              console.error('Error inserting booking:', error);
              throw error;
            }

            // Get Google Calendar authorization URL
            try {
              const authResponse = await fetch(
                `${supabaseUrl}/functions/v1/google-calendar`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ action: 'getAuthUrl' })
                }
              );

              if (!authResponse.ok) {
                throw new Error('Failed to get authorization URL');
              }

              const authData = await authResponse.json();
              console.log('Auth response:', authData); // Debug log
              
              if (authData && authData.url) {
                reply = `Perfect! Your appointment has been booked. To add it to your Google Calendar, please authorize access by clicking this link: ${authData.url}. After authorizing, the event will be created automatically. Is there anything else I can help you with?`;
              } else {
                throw new Error('Invalid authorization URL response');
              }
              bookingState = { step: 'initial' };
            } catch (calendarError) {
              console.error('Error with Google Calendar:', calendarError);
              reply = "Your appointment has been booked, but there was an issue connecting to Google Calendar. You may need to add it to your calendar manually. Is there anything else I can help you with?";
              bookingState = { step: 'initial' };
            }
          } catch (error) {
            console.error('Full booking error:', error);
            reply = "I'm sorry, there was an error creating your booking. Please try again.";
            bookingState = { step: 'date' };
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

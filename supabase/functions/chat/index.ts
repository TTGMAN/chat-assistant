
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, state } = await req.json();
    let reply = '';
    let bookingState = state || { step: 'initial' };

    switch (bookingState.step) {
      case 'initial':
        if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('schedule') || message.toLowerCase().includes('book')) {
          reply = "Great! First, could you please tell me your name?";
          bookingState.step = 'name';
        } else {
          reply = "I understand. Feel free to let me know when you'd like to schedule an appointment!";
        }
        break;

      case 'name':
        bookingState.customerName = message;
        bookingState.title = `${message} - Appointment`;
        reply = "Thanks! Could you please provide your phone number?";
        bookingState.step = 'phone';
        break;

      case 'phone':
        bookingState.phone = message;
        reply = "Great! Now, please provide your email address.";
        bookingState.step = 'email';
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          reply = "That doesn't look like a valid email address. Please try again.";
          break;
        }
        bookingState.email = message;
        reply = "Could you briefly describe the reason for your appointment?";
        bookingState.step = 'description';
        break;

      case 'description':
        bookingState.description = message;
        reply = "Thank you! Now, what date would you like to schedule? (MM/DD/YYYY, or say 'tomorrow' or 'next week')";
        bookingState.step = 'date';
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
          
          const { data: existingBookings, error: bookingsError } = await supabase
            .from('calendar_bookings')
            .select('start_time, end_time')
            .gte('start_time', set(parsedDate, { hours: 0, minutes: 0, seconds: 0 }).toISOString())
            .lte('start_time', set(parsedDate, { hours: 23, minutes: 59, seconds: 59 }).toISOString());

          if (bookingsError) {
            console.error('Error checking bookings:', bookingsError);
            reply = "Sorry, there was an error checking available time slots. Please try again.";
            break;
          }

          const bookedHours = new Set(
            existingBookings?.map(booking => new Date(booking.start_time).getHours()) || []
          );

          const allHours = [9, 10, 11, 13, 14, 15, 16];
          const availableHours = allHours.filter(hour => {
            if (bookedHours.has(hour)) return false;
            if (isToday(parsedDate)) {
              const currentHour = new Date().getHours();
              return hour > currentHour;
            }
            return true;
          });

          if (availableHours.length === 0) {
            reply = "Sorry, there are no available time slots for this date. Please choose another date.";
            break;
          }

          const formattedDate = format(parsedDate, 'EEEE, MMMM do, yyyy');
          const timeOptions = availableHours
            .map(hour => `${hour}:00`)
            .join(', ');

          reply = `Perfect! For ${formattedDate}, I can offer these available time slots: ${timeOptions}. Which hour works best for you?`;
          bookingState.step = 'time';
        } else {
          reply = "I couldn't understand that date. Please provide a date in MM/DD/YYYY format, or say 'tomorrow' or 'next week'.";
        }
        break;

      case 'time':
        const timeMatch = message.match(/(\d{1,2}):?(\d{2})?/);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1]);
          if (hour >= 9 && hour <= 16) {
            bookingState.time = `${hour}:00`;
            reply = `Great! Here's a summary of your appointment:\n\nName: ${bookingState.customerName}\nPhone: ${bookingState.phone}\nEmail: ${bookingState.email}\nReason: ${bookingState.description}\nDate: ${format(parseISO(bookingState.date), 'MMMM do, yyyy')}\nTime: ${bookingState.time}\n\nWould you like to confirm this booking?`;
            bookingState.step = 'confirm';
          } else {
            reply = "Please choose a time between 9:00 AM and 4:00 PM.";
          }
        } else {
          reply = "I couldn't understand that time. Please specify an hour (e.g., '10:00' or just '10').";
        }
        break;

      case 'confirm':
        if (message.toLowerCase().includes('yes')) {
          try {
            const [hours, minutes] = bookingState.time.split(':');
            const startTime = set(parseISO(bookingState.date), {
              hours: parseInt(hours),
              minutes: parseInt(minutes),
              seconds: 0,
              milliseconds: 0
            });
            
            const endTime = set(parseISO(bookingState.date), {
              hours: parseInt(hours) + 1,
              minutes: parseInt(minutes),
              seconds: 0,
              milliseconds: 0
            });

            const bookingData = {
              title: bookingState.title,
              description: bookingState.description,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              booker_email: bookingState.email,
              customer_name: bookingState.customerName,
              phone_number: bookingState.phone,
              status: 'confirmed'
            };

            const { data: existingBookings, error: checkError } = await supabase
              .from('calendar_bookings')
              .select('*')
              .eq('start_time', startTime.toISOString())
              .eq('end_time', endTime.toISOString());

            if (checkError) throw checkError;

            if (existingBookings && existingBookings.length > 0) {
              reply = "I'm sorry, but this time slot has just been taken. Please choose another time.";
              bookingState.step = 'time';
              break;
            }

            const { error } = await supabase
              .from('calendar_bookings')
              .insert([bookingData]);

            if (error) throw error;

            reply = "Perfect! Your appointment has been confirmed. We've sent the details to your email. We look forward to seeing you!";
            bookingState = { step: 'initial' };
          } catch (error) {
            console.error('Booking error:', error);
            reply = "I'm sorry, there was an error creating your booking. Please try again.";
            bookingState = { step: 'date' };
          }
        } else {
          reply = "No problem! Let's start over. What date would you like to book?";
          bookingState = { step: 'date' };
        }
        break;

      default:
        reply = "I'm not sure how to help with that. Would you like to schedule an appointment?";
        bookingState = { step: 'initial' };
    }

    return new Response(
      JSON.stringify({ reply, state: bookingState }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});

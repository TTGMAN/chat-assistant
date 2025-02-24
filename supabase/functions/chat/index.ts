
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, state } = await req.json();

    // Create a Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let reply = '';
    let bookingState = state || { step: 'initial' };

    // Check available time slots for a given date
    const getAvailableSlots = async (date: string) => {
      const { data: bookings } = await supabase
        .from('calendar_bookings')
        .select('start_time')
        .eq('start_time::date', date);

      const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
      const bookedSlots = bookings?.map(b => {
        const time = new Date(b.start_time);
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      }) || [];

      return allSlots.filter(slot => !bookedSlots.includes(slot));
    };

    // Use GPT to process the user's message and generate a response
    const processWithGPT = async (userMessage: string, currentState: any, availableSlots?: string[]) => {
      try {
        const messages = [
          {
            role: "system",
            content: `You are a friendly booking assistant. Extract relevant booking information from user messages.
            Current state: ${JSON.stringify(currentState)}
            ${availableSlots ? `Available time slots: ${availableSlots.join(', ')}` : ''}
            
            Rules:
            - Be friendly and conversational
            - Extract information even from messages with typos
            - If collecting a name, return it in name field
            - If collecting an email, validate and return it in email field
            - If collecting a date, return it in YYYY-MM-DD format in date field
            - If collecting a time, only suggest from available slots
            - Use different variations of questions to make conversation natural
            - If information is invalid, explain why and ask again
            Do not mention that you are an AI. Just process the information and respond naturally.`
          },
          {
            role: "user",
            content: userMessage
          }
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
          }),
        });

        const data = await response.json();
        const gptResponse = data.choices[0].message.content;
        
        // Parse the response for any extracted information
        const extracted = {
          reply: gptResponse,
          name: gptResponse.match(/name:(.*?)(\n|$)/i)?.[1]?.trim(),
          email: gptResponse.match(/email:(.*?)(\n|$)/i)?.[1]?.trim(),
          date: gptResponse.match(/date:(.*?)(\n|$)/i)?.[1]?.trim(),
          time: gptResponse.match(/time:(.*?)(\n|$)/i)?.[1]?.trim(),
        };

        return extracted;
      } catch (error) {
        console.error('Error processing with GPT:', error);
        throw error;
      }
    };

    // Process the current step
    if (bookingState.step === 'initial') {
      const processed = await processWithGPT(message, bookingState);
      reply = "I'd be happy to help you book an appointment! Could you tell me your name?";
      bookingState.step = 'name';
    } else if (bookingState.step === 'name') {
      const processed = await processWithGPT(message, bookingState);
      if (processed.name) {
        bookingState.customerName = processed.name;
        reply = `Thanks ${processed.name}! What's your email address so I can send you the booking confirmation?`;
        bookingState.step = 'email';
      } else {
        reply = "I didn't quite catch your name. Could you please tell me again?";
      }
    } else if (bookingState.step === 'email') {
      const processed = await processWithGPT(message, bookingState);
      if (processed.email) {
        bookingState.email = processed.email;
        reply = "Perfect! What date would you like to book? (You can say something like 'tomorrow' or give me a specific date)";
        bookingState.step = 'date';
      } else {
        reply = "I need a valid email address to send you the confirmation. Could you please provide one?";
      }
    } else if (bookingState.step === 'date') {
      const processed = await processWithGPT(message, bookingState);
      if (processed.date) {
        bookingState.date = processed.date;
        const availableSlots = await getAvailableSlots(processed.date);
        if (availableSlots.length === 0) {
          reply = "I'm sorry, but that date is fully booked. Could you please choose another date?";
        } else {
          reply = `Great! Here are the available time slots for ${processed.date}: ${availableSlots.join(', ')}. What time would you prefer?`;
          bookingState.availableSlots = availableSlots;
          bookingState.step = 'time';
        }
      } else {
        reply = "I need a specific date for your appointment. Could you please provide one?";
      }
    } else if (bookingState.step === 'time') {
      const processed = await processWithGPT(message, { ...bookingState, availableSlots: bookingState.availableSlots });
      if (processed.time && bookingState.availableSlots.includes(processed.time)) {
        bookingState.time = processed.time;
        reply = `Perfect! Just to confirm: You want to book an appointment for ${bookingState.date} at ${processed.time} under the name ${bookingState.customerName}. Is this correct? (Yes/No)`;
        bookingState.step = 'confirm';
      } else {
        reply = `I'm sorry, but that time isn't available. Please choose from these times: ${bookingState.availableSlots.join(', ')}`;
      }
    } else if (bookingState.step === 'confirm') {
      const processed = await processWithGPT(message, bookingState);
      if (processed.reply.toLowerCase().includes('yes')) {
        const { data, error } = await supabase
          .from('calendar_bookings')
          .insert({
            booker_email: bookingState.email,
            customer_name: bookingState.customerName,
            title: 'Appointment Booking',
            description: 'Booked via Chatbot',
            start_time: `${bookingState.date}T${bookingState.time}`,
            end_time: `${bookingState.date}T${bookingState.time}`,
          })
          .select()
          .single();

        if (error) throw error;

        reply = `Great! Your appointment has been booked for ${bookingState.date} at ${bookingState.time}. I've sent a confirmation email to ${bookingState.email}. Is there anything else I can help you with?`;
        bookingState = { step: 'complete' };
      } else {
        reply = "No problem! Let's start over. What date would you like to book?";
        bookingState.step = 'date';
      }
    }

    return new Response(
      JSON.stringify({ reply, state: bookingState }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});

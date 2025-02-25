import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const MAX_REQUESTS_PER_MINUTE = 20;
const MAX_BOOKINGS_PER_DAY = 3;
const MESSAGE_SIMILARITY_THRESHOLD = 0.9;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Chat function invoked');
    const { message, state, messages } = await req.json();
    console.log('Received request:', { message, state });

    const clientIp = req.headers.get('x-real-ip') || 'unknown';
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check rate limiting
    const { data: rateLimit, error: rateLimitError } = await supabase
      .from('chat_rate_limits')
      .upsert(
        { ip_address: clientIp },
        { onConflict: 'ip_address' }
      )
      .select()
      .single();

    if (rateLimitError) {
      console.error('Error checking rate limit:', rateLimitError);
      throw rateLimitError;
    }

    const now = new Date();
    const lastRequest = new Date(rateLimit.last_request);
    const timeDiff = (now.getTime() - lastRequest.getTime()) / 1000; // in seconds

    // Reset counter if it's been more than a minute
    if (timeDiff > 60) {
      await supabase
        .from('chat_rate_limits')
        .update({ request_count: 1, last_request: now.toISOString() })
        .eq('ip_address', clientIp);
    } else {
      // Check if rate limit exceeded
      if (rateLimit.request_count >= MAX_REQUESTS_PER_MINUTE) {
        return new Response(
          JSON.stringify({
            reply: "I'm sorry, but you're sending too many messages. Please wait a minute and try again.",
            state: state
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment request count
      await supabase
        .from('chat_rate_limits')
        .update({
          request_count: rateLimit.request_count + 1,
          last_request: now.toISOString()
        })
        .eq('ip_address', clientIp);
    }

    // Check for message similarity with previous message
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 2].text;
      if (message === lastMessage) {
        return new Response(
          JSON.stringify({
            reply: "I notice you're sending the same message repeatedly. How can I help you differently?",
            state: state
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let reply = '';
    let bookingState = state || { step: 'initial' };

    const getAvailableSlots = async (date: string) => {
      console.log('Checking availability for date:', date);
      const { data: bookings, error } = await supabase
        .from('calendar_bookings')
        .select('start_time')
        .eq('start_time::date', date);

      if (error) {
        console.error('Error fetching bookings:', error);
        throw error;
      }

      const allSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
      const bookedSlots = bookings?.map(b => {
        const time = new Date(b.start_time);
        return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      }) || [];

      const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      console.log('Available slots:', availableSlots);
      return availableSlots;
    };

    const processWithGPT = async (userMessage: string, currentState: any, availableSlots?: string[]) => {
      console.log('Processing message with GPT:', userMessage);
      try {
        const messages = [
          {
            role: "system",
            content: `You are a friendly booking assistant. Your task is to extract booking information.
            Current state: ${JSON.stringify(currentState)}
            ${availableSlots ? `Available time slots: ${availableSlots.join(', ')}` : ''}
            
            IMPORTANT: When responding, you must:
            1. If you detect a name, include a line that starts with "NAME:" followed by the name
            2. If you detect an email, include a line that starts with "EMAIL:" followed by the email
            3. If you detect a date, include a line that starts with "DATE:" followed by the date in YYYY-MM-DD format
            4. If you detect a time, include a line that starts with "TIME:" followed by the time in HH:MM format

            Only extract information that matches the current step. Do not try to extract other information.
            Current step is: ${currentState.step}

            Example response when asking for name:
            Nice to meet you! 
            NAME: John Smith

            Example response when asking for email:
            Thanks! 
            EMAIL: john@example.com
            `
          },
          {
            role: "user",
            content: userMessage
          }
        ];

        console.log('Sending request to GPT...');
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
        console.log('GPT raw response:', data);
        
        if (!data.choices?.[0]?.message?.content) {
          console.error('Invalid GPT response:', data);
          throw new Error('Invalid GPT response');
        }

        const gptResponse = data.choices[0].message.content;
        console.log('GPT processed response:', gptResponse);

        // Improved extraction with more specific patterns
        const extracted = {
          reply: gptResponse.replace(/NAME:|EMAIL:|DATE:|TIME:/g, '').trim(),
          name: gptResponse.match(/NAME:\s*([^\n]+)/i)?.[1]?.trim(),
          email: gptResponse.match(/EMAIL:\s*([^\n]+)/i)?.[1]?.trim(),
          date: gptResponse.match(/DATE:\s*([^\n]+)/i)?.[1]?.trim(),
          time: gptResponse.match(/TIME:\s*([^\n]+)/i)?.[1]?.trim(),
        };

        console.log('Extracted information:', extracted);
        return extracted;
      } catch (error) {
        console.error('Error processing with GPT:', error);
        throw error;
      }
    };

    if (bookingState.step === 'initial') {
      reply = "I'd be happy to help you book an appointment! Could you tell me your name?";
      bookingState.step = 'name';
    } else if (bookingState.step === 'name') {
      console.log('Processing name step with message:', message);
      const processed = await processWithGPT(message, bookingState);
      console.log('Name processing result:', processed);
      
      if (processed.name) {
        bookingState.customerName = processed.name;
        reply = `Thanks ${processed.name}! What's your email address so I can send you the booking confirmation?`;
        bookingState.step = 'email';
      } else {
        reply = "I didn't quite catch your name. Could you please tell me your full name?";
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
        // Check daily booking limit before creating booking
        const today = new Date().toISOString().split('T')[0];
        const { data: bookingCount, error: bookingCountError } = await supabase
          .from('daily_booking_counts')
          .select('booking_count')
          .eq('email', bookingState.email)
          .eq('booking_date', today)
          .single();

        if (bookingCountError && bookingCountError.code !== 'PGRST116') {
          console.error('Error checking booking count:', bookingCountError);
          throw bookingCountError;
        }

        const currentCount = bookingCount?.booking_count || 0;
        if (currentCount >= MAX_BOOKINGS_PER_DAY) {
          reply = `I'm sorry, but you've reached the maximum number of bookings (${MAX_BOOKINGS_PER_DAY}) allowed per day. Please try again tomorrow.`;
          bookingState.step = 'complete';
          return new Response(
            JSON.stringify({ reply, state: bookingState }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Creating booking:', {
          booker_email: bookingState.email,
          customer_name: bookingState.customerName,
          start_time: `${bookingState.date}T${bookingState.time}`,
        });

        // Start a transaction to create booking and update count
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

        if (error) {
          console.error('Error creating booking:', error);
          throw error;
        }

        // Update the daily booking count
        await supabase
          .from('daily_booking_counts')
          .upsert({
            email: bookingState.email,
            booking_date: today,
            booking_count: currentCount + 1
          });

        console.log('Booking created successfully:', data);

        reply = `Great! Your appointment has been booked for ${bookingState.date} at ${bookingState.time}. I've sent a confirmation email to ${bookingState.email}. Is there anything else I can help you with?`;
        bookingState = { step: 'complete' };
      } else {
        reply = "No problem! Let's start over. Could you tell me your name?";
        bookingState = { step: 'name' };
      }
    }

    console.log('Sending response:', { reply, state: bookingState });

    return new Response(
      JSON.stringify({ reply, state: bookingState }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

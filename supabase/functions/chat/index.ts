
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    console.log('Received message:', message);

    // Initialize booking state
    let bookingContext = {
      step: 'initial',
      date: null,
      time: null,
      title: null,
      email: null,
    };

    // Available time slots
    const availableSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

    // Process booking based on message content
    let reply = '';

    // Check if the message contains a request to book an appointment
    if (message.toLowerCase().includes('book') || message.toLowerCase().includes('appointment')) {
      reply = "I'll help you book an appointment! Please provide a preferred date (e.g., tomorrow, next Monday, or a specific date).";
      bookingContext.step = 'date';
    } 
    // Check if message contains a date
    else if (message.toLowerCase().includes('tomorrow') || message.toLowerCase().includes('next') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(message)) {
      reply = `Great! Here are our available time slots: ${availableSlots.join(', ')}. Which time would you prefer?`;
      bookingContext.step = 'time';
    }
    // Check if message contains a time
    else if (availableSlots.some(slot => message.includes(slot))) {
      reply = "Perfect! Please provide a title for your appointment.";
      bookingContext.step = 'title';
    }
    // Default response
    else {
      reply = "I'm here to help you book an appointment. Would you like to schedule one now?";
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

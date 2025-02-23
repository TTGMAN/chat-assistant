import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, state, messages } = await req.json()

    // Create a Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let reply = ''
    let bookingState = state || { step: 'initial' }

    if (bookingState.step === 'initial') {
      reply = "Great! Let's get started. What is your name?"
      bookingState.step = 'name'
    } else if (bookingState.step === 'name') {
      bookingState.customerName = message
      reply = `Thanks ${bookingState.customerName}! And your email address?`
      bookingState.step = 'email'
    } else if (bookingState.step === 'email') {
      bookingState.email = message
      reply = "Got it. What day would you like to book your appointment?"
      bookingState.step = 'date'
    } else if (bookingState.step === 'date') {
      bookingState.date = message
      reply = "And what time works best for you?"
      bookingState.step = 'time'
    } else if (bookingState.step === 'time') {
      bookingState.time = message
      reply = `Okay, just to confirm: You want to book an appointment for ${bookingState.date} at ${bookingState.time}. Does that sound right?`
      bookingState.step = 'confirm'
    }

    // When confirming a booking, save the chat log
    if (bookingState.step === 'confirm' && message.toLowerCase().includes('yes')) {
      try {
        const { data, error } = await supabase
          .from('calendar_bookings')
          .insert({
            booker_email: bookingState.email,
            customer_name: bookingState.customerName,
            title: 'Appointment Booking',
            description: 'Booked via Chatbot',
            start_time: bookingState.date + 'T' + bookingState.time,
            end_time: bookingState.date + 'T' + bookingState.time,
          })
          .select()
          .single()

        if (error) throw error

        // After successful booking creation, save the chat log
        const { error: chatLogError } = await supabase
          .from('chat_logs')
          .insert({
            messages,
            booking_id: data.id,
            customer_name: bookingState.customerName,
            customer_email: bookingState.email
          })

        if (chatLogError) throw chatLogError

        reply = "Awesome! Your appointment has been booked. We'll see you then!"
        bookingState = { step: 'complete' }
      } catch (error) {
        console.error('Error saving chat log:', error)
      }
    }

    return new Response(
      JSON.stringify({ reply, state: bookingState }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})

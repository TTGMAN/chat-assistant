
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OAuth2Client } from "https://deno.land/x/oauth2_client@v1.0.2/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const redirectUri = Deno.env.get('REDIRECT_URI') || 'http://localhost:8080/api/auth/callback/google';

const oauth2Client = new OAuth2Client({
  clientId,
  clientSecret,
  authorizationEndpointUri: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUri: "https://oauth2.googleapis.com/token",
  redirectUri,
  defaults: {
    scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar"],
  },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, bookingData, code } = await req.json();

    switch (action) {
      case 'getAuthUrl':
        const authUrl = await oauth2Client.code.getAuthorizationUri();
        return new Response(
          JSON.stringify({ url: authUrl.toString() }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'exchangeCode':
        if (!code) {
          throw new Error('No authorization code provided');
        }

        try {
          const tokens = await oauth2Client.code.getToken(code);
          oauth2Client.setCredentials(tokens);
          
          return new Response(
            JSON.stringify({ success: true, tokens }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error('Token exchange error:', error);
          throw new Error('Failed to exchange authorization code for tokens');
        }

      case 'createEvent':
        const { title, start_time, end_time, booker_email } = bookingData;
        const { access_token } = req.headers.get('Authorization')?.split(' ')[1] 
          ? JSON.parse(atob(req.headers.get('Authorization')!.split(' ')[1]))
          : {};

        if (!access_token) {
          throw new Error('No access token provided');
        }

        const event = {
          summary: title,
          start: {
            dateTime: start_time,
            timeZone: 'UTC',
          },
          end: {
            dateTime: end_time,
            timeZone: 'UTC',
          },
          attendees: [
            { email: booker_email }
          ],
          reminders: {
            useDefault: true
          }
        };

        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event)
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Google Calendar API error:', errorText);
          throw new Error(`Failed to create calendar event: ${errorText}`);
        }

        const calendarEvent = await response.json();
        return new Response(
          JSON.stringify({ success: true, event: calendarEvent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

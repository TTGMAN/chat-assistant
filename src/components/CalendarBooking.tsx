
import React, { useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, set } from "date-fns";
import { toast } from "sonner";

export const CalendarBooking = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [availableSlots] = useState([
    "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"
  ]);

  const handleBooking = async () => {
    if (!date || !timeSlot || !title || !email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Convert selected date and time to UTC timestamp
      const [hours, minutes] = timeSlot.split(':');
      const startTime = set(date, {
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        seconds: 0,
        milliseconds: 0
      });
      const endTime = set(date, {
        hours: parseInt(hours) + 1,
        minutes: parseInt(minutes),
        seconds: 0,
        milliseconds: 0
      });

      const { data, error } = await supabase
        .from('calendar_bookings')
        .insert([
          {
            title,
            description,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            booker_email: email,
          }
        ]);

      if (error) throw error;

      toast.success("Booking submitted successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setEmail("");
      setTimeSlot("");
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error("Failed to book appointment. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Book an Appointment</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Date</label>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
            className="rounded-md border"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Available Time Slots</label>
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => (
              <Button
                key={slot}
                variant={timeSlot === slot ? "default" : "outline"}
                onClick={() => setTimeSlot(slot)}
                className="w-full"
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Meeting description"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            required
          />
        </div>

        <Button
          onClick={handleBooking}
          className="w-full"
        >
          Book Appointment
        </Button>
      </div>
    </div>
  );
};

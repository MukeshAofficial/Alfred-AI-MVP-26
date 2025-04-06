'use server'

import { createServerSupabaseClient } from './supabase-server'

export async function createTestBooking() {
  try {
    const supabase = createServerSupabaseClient()
    console.log("Creating test booking...")
    
    // Get current timestamp
    const now = new Date().toISOString()
    
    // Create a test booking record
    const testBookingData = {
      service_id: "70ae3d89-983f-48b7-9627-81e117b7c05c", // Use the service ID from your logs
      user_id: "5c517562-f4e1-488f-9136-74ad5d4d52e0", // Use the user ID from your logs
      vendor_id: "025d32a6-bbfe-41fd-a8e2-05cacfe0e65b", // Use the vendor ID from your logs
      status: "confirmed",
      payment_status: "paid",
      payment_intent: "test_payment_" + Date.now(),
      amount_paid: 100,
      currency: "USD",
      booking_date: new Date("2025-04-06").toISOString(),
      created_at: now,
      metadata: {
        session_id: "test_session_" + Date.now(),
        customer_email: "test@example.com",
        customer_name: "Test User",
        time: new Date().toLocaleTimeString()
      }
    }
    
    console.log("Inserting test booking data:", testBookingData)
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(testBookingData)
      .select()
      .single()
      
    if (error) {
      console.error("Error creating test booking:", error)
      console.error("Error code:", error.code)
      console.error("Error details:", error.details)
      console.error("Error hint:", error.hint)
      throw new Error(`Test booking creation failed: ${error.message}`)
    }
    
    console.log("Test booking created successfully:", data)
    return { success: true, data }
  } catch (err: any) {
    console.error("Test booking error:", err)
    throw new Error(`Test booking creation failed: ${err.message}`)
  }
} 
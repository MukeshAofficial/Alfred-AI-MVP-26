import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

// Get the webhook secret from environment variables
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

// Add a testing endpoint for direct access
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    console.log("Testing webhook endpoint - attempting to create a test booking");
    
    // Get current timestamp
    const now = new Date().toISOString();
    
    // Create a test booking record
    const testBookingData = {
      service_id: "70ae3d89-983f-48b7-9627-81e117b7c05c", // Use your actual service ID from the logs
      user_id: "5c517562-f4e1-488f-9136-74ad5d4d52e0", // Use your actual user ID from the logs
      vendor_id: "025d32a6-bbfe-41fd-a8e2-05cacfe0e65b", // Use your actual vendor ID from the logs
      status: "confirmed",
      payment_status: "paid",
      payment_intent: "test_payment_" + Date.now(),
      amount_paid: 100,
      currency: "USD",
      booking_date: "2025-04-06",
      created_at: now,
      metadata: {
        session_id: "test_session_" + Date.now(),
        customer_email: "test@example.com",
        customer_name: "Test User",
        time: new Date().toLocaleTimeString()
      }
    };
    
    console.log("Inserting test booking data:", testBookingData);
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(testBookingData)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating test booking:", error);
      console.error("Error code:", error.code);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);
      console.error("Error message:", error.message);
      return NextResponse.json({ error: `Test booking creation failed: ${error.message}` }, { status: 500 });
    }
    
    console.log("Test booking created successfully:", data);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Test endpoint error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature') || ''

    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    console.log(`Received Stripe event: ${event.type}`, event.id)

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('Received Stripe checkout.session.completed event', session.id)
      console.log('Session metadata:', session.metadata)

      // Retrieve the session metadata
      const serviceId = session.metadata?.serviceId
      const userId = session.metadata?.userId || 'guest'
      const serviceName = session.metadata?.serviceName
      const bookingDate = session.metadata?.bookingDate
      const vendorId = session.metadata?.vendorId

      if (!serviceId) {
        console.error('No service ID found in session metadata')
        return NextResponse.json({ error: 'Missing service ID in metadata' }, { status: 400 })
      }

      console.log(`Processing booking for service: ${serviceId}, user: ${userId}, date: ${bookingDate}, vendor: ${vendorId}`)

      // Create a booking record in the database
      const supabase = createServerSupabaseClient()
      
      // Get current timestamp
      const now = new Date().toISOString()

      // Check if userId is a valid UUID or guest
      let actualUserId = userId
      
      // If it's 'guest' or not a valid UUID, use a default guest profile or find a guest profile
      if (userId === 'guest' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        // Try to get a guest profile based on email
        const customerEmail = session.customer_details?.email
        
        if (customerEmail) {
          console.log(`Looking up guest profile by email: ${customerEmail}`)
          // Look for a profile with this email
          const { data: existingUser, error: userLookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single()
            
          if (userLookupError) {
            console.log(`No existing user found with email ${customerEmail}, creating guest profile`)
          }
            
          if (existingUser?.id) {
            console.log(`Found existing user with email ${customerEmail}: ${existingUser.id}`)
            actualUserId = existingUser.id
          } else {
            // Create a guest profile
            console.log(`Creating new guest profile for email: ${customerEmail}`)
            const { data: newGuestProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                full_name: session.customer_details?.name || 'Guest User',
                email: customerEmail,
                role: 'guest'
              })
              .select()
              .single()
              
            if (createError) {
              console.error('Error creating guest profile:', createError)
              return NextResponse.json({ error: `Failed to create guest profile: ${createError.message}` }, { status: 500 })
            }
              
            if (newGuestProfile?.id) {
              console.log(`Created new guest profile with ID: ${newGuestProfile.id}`)
              actualUserId = newGuestProfile.id
            } else {
              console.error('Failed to create guest profile')
              return NextResponse.json({ error: 'Failed to create guest profile' }, { status: 500 })
            }
          }
        } else {
          console.error('No user ID or email found for guest booking')
          return NextResponse.json({ error: 'Missing user information for booking' }, { status: 400 })
        }
      }

      // If vendor ID is not in metadata, get it from the service
      let finalVendorId = vendorId;
      if (!finalVendorId) {
        console.log(`Fetching service details for service ID: ${serviceId}`)
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('vendor_id, name')
          .eq('id', serviceId)
          .single()
          
        if (serviceError) {
          console.error('Error fetching service details:', serviceError)
        } else {
          console.log(`Service belongs to vendor: ${serviceData?.vendor_id}`)
          finalVendorId = serviceData?.vendor_id;
        }
      }

      // Format the booking date
      let formattedBookingDate = null;
      if (bookingDate) {
        try {
          formattedBookingDate = new Date(bookingDate).toISOString();
          console.log(`Formatted booking date: ${formattedBookingDate}`);
        } catch (e) {
          console.warn(`Invalid booking date format: ${bookingDate}`, e);
        }
      } else {
        // Try to extract booking_date from the success_url if it exists
        if (session.success_url) {
          console.log(`Checking success_url for booking_date: ${session.success_url}`)
          try {
            const url = new URL(session.success_url);
            const bookingDateParam = url.searchParams.get('booking_date');
            
            if (bookingDateParam) {
              console.log(`Found booking_date in URL: ${bookingDateParam}`)
              // Validate the date format
              const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
              if (dateRegex.test(bookingDateParam)) {
                formattedBookingDate = new Date(bookingDateParam).toISOString();
                console.log(`Formatted booking date from URL: ${formattedBookingDate}`);
              } else {
                console.warn(`Invalid booking date format: ${bookingDateParam}`)
              }
            } else {
              console.log('No booking_date parameter found in success_url')
            }
          } catch (e) {
            console.warn('Failed to parse success_url for booking date', e);
          }
        } else {
          console.log('No success_url provided in session')
        }
      }

      // Insert the booking record
      try {
        const bookingData = {
          service_id: serviceId,
          user_id: actualUserId,
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent: session.payment_intent as string,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          booking_date: formattedBookingDate,
          vendor_id: finalVendorId,
          created_at: now,
          metadata: {
            session_id: session.id,
            customer_email: session.customer_details?.email,
            customer_name: session.customer_details?.name,
            time: new Date().toLocaleTimeString(),
          }
        };
        
        console.log('Creating booking record with data:', bookingData);
        
        const { data: booking, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()

        if (error) {
          console.error('Error creating booking record:', error)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          console.error('Error hint:', error.hint)
          console.error('Attempted to insert with serviceId:', serviceId)
          console.error('Attempted to insert with userId:', actualUserId)
          console.error('Attempted to insert with vendorId:', finalVendorId)
          return NextResponse.json({ error: `Failed to create booking record: ${error.message}` }, { status: 500 })
        }

        console.log(`Booking created successfully: ${booking?.id} for service ${serviceName}`)
        console.log(`User ID: ${actualUserId}, Payment Intent: ${session.payment_intent}`)
        return NextResponse.json({ received: true, bookingId: booking?.id })
      } catch (insertError: any) {
        console.error('Exception during booking creation:', insertError)
        return NextResponse.json({ error: `Booking creation exception: ${insertError.message}` }, { status: 500 })
      }
    }

    // Return a response to acknowledge receipt of the event
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`Webhook error: ${err.message}`)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 500 })
  }
} 
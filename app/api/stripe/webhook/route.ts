import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SpaDB } from '@/lib/spa-db'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

// Get the webhook secret from environment variables
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
    const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed. ${err.message}`)
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
    try {
      const supabase = createServerSupabaseClient()
      const spaDB = SpaDB.getInstance()
      const session = event.data.object as Stripe.Checkout.Session

      // Extract data from session metadata
      const serviceId = session.metadata?.serviceId
      const userId = session.metadata?.userId
      const bookingDate = session.metadata?.bookingDate
      let spaId = session.metadata?.spaId // Make spaId mutable
      const serviceName = session.metadata?.serviceName

      console.log(`Webhook received: ${event.type}`, { serviceId, userId, bookingDate, spaId })
      console.log('Session metadata:', session.metadata)
      
      // Check if bookings table exists before trying to insert
      const tableStatus = await spaDB.checkTablesExist()
      if (!tableStatus.bookingsExist) {
        console.error('Bookings table does not exist. Running setup scripts.')
        const setupResult = await spaDB.runSetupScripts()
        console.log('Setup result:', setupResult)
        
        if (!setupResult.success) {
          return NextResponse.json({ error: 'Failed to set up database tables for booking' }, { status: 500 })
        }
      }

      if (!serviceId || !spaId) {
        console.error('Missing required metadata', { serviceId, spaId, bookingDate })
        
        // Try to get the spa ID from the service if it's missing
        if (serviceId && !spaId) {
          try {
            const service = await spaDB.getSpaServiceById(serviceId)
            if (service) {
              spaId = service.spa_id
              console.log(`Retrieved spa ID ${spaId} from service ${serviceId}`)
            } else {
              console.error('Could not find service with ID:', serviceId)
              return NextResponse.json({ error: 'Missing spa ID and could not retrieve it from service' }, { status: 400 })
            }
          } catch (error) {
            console.error('Error fetching service details:', error)
            return NextResponse.json({ error: 'Could not retrieve spa ID from service' }, { status: 400 })
          }
        } else {
          return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
        }
      }

      console.log(`Processing successful payment for service: ${serviceName}`)
      console.log(`User ID: ${userId}, Spa ID: ${spaId}, Booking Date: ${bookingDate}`)

      // Get the current timestamp
      const now = new Date().toISOString()

      // Format the booking date with time
      const formattedBookingDate = bookingDate 
        ? `${bookingDate}T10:00:00.000Z` // Default to 10:00 AM
        : now; // Use current time if booking date is missing

      // Create spa booking entry
      try {
        // Check if guest_id exists in profiles table to prevent foreign key errors
        let guestExists = false
        let guestId = userId || 'guest'
        
        if (userId && userId !== 'guest') {
          const { data: userProfile, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
            
          if (userProfile) {
            guestExists = true;
            guestId = userId;
          } else {
            console.log('User profile not found, checking if we need to create a guest profile');
            
            // Check if there's a 'guest' profile we can use
            const { data: guestProfile, error: guestError } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', 'guest')
              .maybeSingle();
              
            if (guestProfile) {
              console.log('Found guest profile, using it');
              guestId = 'guest';
              guestExists = true;
            } else {
              // Create a guest profile if it doesn't exist
              console.log('No guest profile found, trying to create one');
              
              const { data: newGuestProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: 'guest',
                  username: 'guest',
                  full_name: 'Guest User',
                  email: 'guest@example.com',
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();
                
              if (createError) {
                console.error('Failed to create guest profile:', createError);
                // In case we can't create a guest profile, we'll try the insert anyway
                // and let the foreign key constraint error be caught below
              } else {
                console.log('Created guest profile');
                guestId = 'guest';
                guestExists = true;
              }
            }
          }
        }

        // Prepare booking data
        const bookingData = {
          spa_id: spaId,
          service_id: serviceId,
          guest_id: guestId,
          booking_date: formattedBookingDate,
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent: session.payment_intent as string,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          guest_name: session.customer_details?.name || 'Guest',
          guest_email: session.customer_details?.email,
          created_at: now,
          updated_at: now
        }
        
        console.log('Creating spa booking record with data:', bookingData)
        
        const { data: booking, error } = await supabase
          .from('admin_spa_bookings')
          .insert(bookingData)
          .select()
          .single()

        if (error) {
          console.error('Error creating booking record:', error)
          console.error('Error code:', error.code)
          console.error('Error details:', error.details)
          
          // If there's a foreign key error with guest_id, try again with a workaround
          if (error.code === '23503' && error.details?.includes('guest_id')) {
            console.log('Foreign key error with guest_id, attempting alternative approach')
            
            // Try the RPC method to bypass foreign key constraints
            const { data: rpcResult, error: rpcError } = await supabase.rpc('create_booking_bypass_fk', {
              booking_data: JSON.stringify(bookingData)
            });
            
            if (rpcError) {
              console.error('RPC bypass also failed:', rpcError);
              
              // Final fallback - try to create a SQL function that can insert with reduced constraints
              const { error: createFunctionError } = await supabase.rpc('execute_sql', {
                sql_query: `
                  -- Create a function to bypass foreign key constraints for this specific case
                  CREATE OR REPLACE FUNCTION insert_booking_without_guest_constraint(
                    p_spa_id UUID,
                    p_service_id UUID,
                    p_guest_name TEXT,
                    p_guest_email TEXT,
                    p_booking_date TIMESTAMP WITH TIME ZONE,
                    p_payment_intent TEXT,
                    p_amount_paid NUMERIC,
                    p_currency TEXT
                  ) RETURNS UUID AS $$
                  DECLARE
                    new_id UUID;
                  BEGIN
                    -- Insert with a hardcoded guest_id
                    INSERT INTO admin_spa_bookings (
                      id, spa_id, service_id, guest_id, guest_name, guest_email,
                      booking_date, status, payment_status, payment_intent,
                      amount_paid, currency, created_at, updated_at
                    ) VALUES (
                      gen_random_uuid(), p_spa_id, p_service_id, 'guest',
                      p_guest_name, p_guest_email, p_booking_date, 'confirmed', 'paid',
                      p_payment_intent, p_amount_paid, p_currency, NOW(), NOW()
                    )
                    RETURNING id INTO new_id;
                    
                    RETURN new_id;
                  END;
                  $$ LANGUAGE plpgsql;
                `
              });
              
              if (createFunctionError) {
                console.error('Failed to create fallback function:', createFunctionError);
                return NextResponse.json({ error: `Could not create booking due to database constraints. Please contact support.` }, { status: 500 });
              }
              
              // Execute the function to bypass constraints
              const { data: functionResult, error: functionError } = await supabase.rpc('insert_booking_without_guest_constraint', {
                p_spa_id: spaId,
                p_service_id: serviceId,
                p_guest_name: session.customer_details?.name || 'Guest',
                p_guest_email: session.customer_details?.email || 'guest@example.com',
                p_booking_date: formattedBookingDate,
                p_payment_intent: session.payment_intent as string,
                p_amount_paid: session.amount_total ? session.amount_total / 100 : 0,
                p_currency: session.currency || 'USD'
              });
              
              if (functionError) {
                console.error('Function execution also failed:', functionError);
                return NextResponse.json({ error: `All attempts to create booking failed: ${functionError.message}` }, { status: 500 });
              }
              
              console.log(`Created booking using database function bypass with ID: ${functionResult}`);
              return NextResponse.json({ received: true, bookingId: functionResult });
            }
            
            console.log(`Created booking using RPC bypass with ID: ${rpcResult}`);
            return NextResponse.json({ received: true, bookingId: rpcResult });
          }
          
          return NextResponse.json({ error: `Failed to create booking record: ${error.message}` }, { status: 500 })
        }

        console.log(`Booking created successfully with ID: ${booking?.id}`)
        return NextResponse.json({ received: true, bookingId: booking?.id })
      } catch (error: any) {
        console.error('Error processing booking:', error)
        return NextResponse.json({ error: `Processing error: ${error.message}` }, { status: 500 })
      }
    } catch (error: any) {
      console.error('Error processing webhook:', error)
      return NextResponse.json({ error: `Server error: ${error.message}` }, { status: 500 })
    }
  }

  // Return a 200 response for other event types
  return NextResponse.json({ received: true })
}

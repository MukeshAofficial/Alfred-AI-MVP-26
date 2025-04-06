import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

// Get the webhook secret from environment variables
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

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

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Retrieve the session metadata
      const serviceId = session.metadata?.serviceId
      const userId = session.metadata?.userId
      const serviceName = session.metadata?.serviceName

      if (!serviceId) {
        console.error('No service ID found in session metadata')
        return NextResponse.json({ error: 'Missing service ID in metadata' }, { status: 400 })
      }

      // Create a booking record in the database
      const supabase = createServerSupabaseClient()
      
      // Get current timestamp
      const now = new Date().toISOString()

      // Insert the booking record
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert({
          service_id: serviceId,
          user_id: userId,
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent: session.payment_intent as string,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          created_at: now,
          metadata: {
            session_id: session.id,
            customer_email: session.customer_details?.email,
            customer_name: session.customer_details?.name,
          },
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating booking record:', error)
        return NextResponse.json({ error: 'Failed to create booking record' }, { status: 500 })
      }

      console.log(`Booking created: ${booking?.id} for service ${serviceName}`)
      return NextResponse.json({ received: true, bookingId: booking?.id })
    }

    // Return a response to acknowledge receipt of the event
    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`Webhook error: ${err.message}`)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 500 })
  }
} 
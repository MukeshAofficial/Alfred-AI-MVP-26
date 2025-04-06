'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { ServiceData } from './services-db'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

export async function createCheckoutSession(serviceId: string) {
  if (!serviceId) {
    throw new Error('Service ID is required')
  }

  try {
    // Get the service details from the database
    const supabase = createServerSupabaseClient()
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single()

    if (error || !service) {
      throw new Error(`Service not found: ${error?.message}`)
    }

    // Get user information if available (for guest identification)
    const { data: { session } } = await supabase.auth.getSession()
    const customerId = session?.user?.id || 'guest'
    const customerEmail = session?.user?.email

    // Create a Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: service.currency || 'usd',
            product_data: {
              name: service.name,
              description: service.description,
              images: service.images || [],
            },
            unit_amount: Math.round(service.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/bookings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout?serviceId=${serviceId}&canceled=true`,
      customer_email: customerEmail,
      metadata: {
        serviceId: service.id,
        userId: customerId,
        serviceName: service.name,
      },
    })

    // Return the session URL for client-side redirection
    return { sessionUrl: stripeSession.url || '' }
  } catch (error: any) {
    console.error('Stripe session creation error:', error)
    throw new Error(`Payment session creation failed: ${error.message}`)
  }
} 
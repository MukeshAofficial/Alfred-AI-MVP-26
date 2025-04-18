'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { RestaurantDB } from './restaurant-db'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

// Define the parameters interface
interface RestaurantCheckoutSessionParams {
  restaurantId: string;
  tableId?: string;
  bookingDate?: string;
  partySize: number;
  userId?: string;
  specialRequests?: string;
}

export async function createRestaurantCheckoutSession({
  restaurantId,
  tableId,
  bookingDate,
  partySize,
  userId,
  specialRequests,
}: RestaurantCheckoutSessionParams) {
  try {
    if (!restaurantId) {
      throw new Error('Restaurant ID is required')
    }

    if (!partySize || partySize < 1) {
      throw new Error('Party size is required and must be at least 1')
    }

    // Get user details from Supabase
    const supabase = createServerSupabaseClient()
    const restaurantDB = RestaurantDB.getInstance()

    // Get restaurant details
    const restaurant = await restaurantDB.getRestaurantById(restaurantId)
    if (!restaurant) {
      throw new Error(`Restaurant with ID ${restaurantId} not found`)
    }

    // Get customer info if userId is provided
    let customerEmail = 'guest@example.com' // Default
    let customerName = 'Guest User' // Default
    let customerId = userId || 'guest'
    let userDetails = null

    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
      }

      if (userData) {
        userDetails = userData
        customerEmail = userData.email || customerEmail
        customerName = userData.full_name || userData.username || customerName
      }
    }

    // Format the booking date for metadata
    const formattedBookingDate = bookingDate || new Date().toISOString().split('T')[0]

    // Calculate booking fee (example: $10 per person with a minimum of $20)
    const bookingFee = Math.max(10 * partySize, 20);

    // Set success URL with query parameters for post-purchase page
    const successUrl = new URL(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ai-buttler.vercel.app'}/restaurant-booking-success`
    )
    successUrl.searchParams.append('restaurantId', restaurantId)
    successUrl.searchParams.append('bookingDate', formattedBookingDate)
    if (userId) successUrl.searchParams.append('userId', userId)
    if (partySize) successUrl.searchParams.append('partySize', partySize.toString())
    if (tableId) successUrl.searchParams.append('tableId', tableId)

    console.log(`Creating Stripe checkout session for restaurant: ${restaurantId}, user: ${customerId}, date: ${formattedBookingDate}, party size: ${partySize}`);

    // Create a Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Table Reservation at ${restaurant.name}`,
              description: `Reservation for ${partySize} people on ${new Date(formattedBookingDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
              images: restaurant.images || [],
            },
            unit_amount: bookingFee * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl.toString(),
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://ai-buttler.vercel.app'}/restaurants?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        bookingType: 'restaurant',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        tableId: tableId || '',
        userId: customerId,
        userFullName: userDetails?.full_name || '',
        bookingDate: formattedBookingDate,
        partySize: partySize.toString(),
        specialRequests: specialRequests || '',
        bookingFee: bookingFee.toString(),
        currency: 'usd'
      },
    })

    console.log('Created Stripe session for restaurant booking with date:', formattedBookingDate);
    console.log('Session metadata:', stripeSession.metadata);

    // Return the session URL for client-side redirection
    return { sessionUrl: stripeSession.url || '', sessionId: stripeSession.id }
  } catch (error: any) {
    console.error('Stripe session creation error for restaurant booking:', error)
    throw new Error(`Restaurant booking payment session creation failed: ${error.message}`)
  }
} 
'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import Stripe from 'stripe'
import { redirect } from 'next/navigation'
import { SpaDB } from './spa-db'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-03-31.basil',
})

// Define the parameters interface
interface CheckoutSessionParams {
  serviceId: string;
  bookingDate?: string;
  userId?: string;
}

// Define interface for creating a booking directly
interface CreateBookingParams {
  sessionId: string;
  serviceId: string;
  userId: string;
  bookingDate: string;
  vendorId?: string;
}

export async function createCheckoutSession({
  serviceId,
  bookingDate,
  userId,
}: CheckoutSessionParams) {
  try {
    if (!serviceId) {
      throw new Error('Service ID is required')
    }

    // Get user details from Supabase
    const supabase = createServerSupabaseClient()
    const spaDB = SpaDB.getInstance()

    // Get service details
    const service = await spaDB.getSpaServiceById(serviceId)
    if (!service) {
      throw new Error(`Service with ID ${serviceId} not found`)
    }

    // Get spa details
    const spa = await spaDB.getSpaById(service.spa_id)
    if (!spa) {
      throw new Error(`Spa with ID ${service.spa_id} not found`)
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

    // Set success URL with query parameters for post-purchase page
    const successUrl = new URL(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking-success`
    )
    successUrl.searchParams.append('serviceId', serviceId)
    successUrl.searchParams.append('bookingDate', formattedBookingDate)
    if (userId) successUrl.searchParams.append('userId', userId)

    console.log(`Creating Stripe checkout session for service: ${serviceId}, user: ${customerId}, date: ${formattedBookingDate}, spa: ${spa.id}`);

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
      success_url: successUrl.toString(),
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/spa-services?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        serviceId: service.id,
        userId: customerId,
        serviceName: service.name,
        userFullName: userDetails?.full_name || '',
        bookingDate: formattedBookingDate,
        spaId: spa.id,
        spaName: spa.name,
        servicePrice: service.price.toString(),
        serviceCurrency: service.currency || 'usd'
      },
    })

    console.log('Created Stripe session with booking date:', formattedBookingDate);
    console.log('Session metadata:', stripeSession.metadata);

    // Return the session URL for client-side redirection
    return { sessionUrl: stripeSession.url || '', sessionId: stripeSession.id }
  } catch (error: any) {
    console.error('Stripe session creation error:', error)
    throw new Error(`Payment session creation failed: ${error.message}`)
  }
}

// Fallback function to create a booking directly if webhook fails
export async function createBookingFromSession({
  sessionId,
  serviceId,
  userId,
  bookingDate,
  vendorId
}: CreateBookingParams) {
  if (!sessionId || !serviceId || !userId || !bookingDate) {
    throw new Error('Missing required parameters for booking creation');
  }

  console.log(`Creating fallback booking from session: ${sessionId}`);
  console.log(`Data: service=${serviceId}, user=${userId}, date=${bookingDate}, vendor=${vendorId}`);

  try {
    // Get the Stripe session to verify it's completed
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed for this session');
    }

    const supabase = createServerSupabaseClient();

    // If vendor ID is not provided, get it from the service
    let finalVendorId = vendorId;
    if (!finalVendorId) {
      console.log(`Fetching service details for service ID: ${serviceId}`);
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('vendor_id, name, price, currency')
        .eq('id', serviceId)
        .single();
        
      if (serviceError) {
        console.error('Error fetching service details:', serviceError);
        throw new Error(`Service not found: ${serviceError.message}`);
      } else {
        console.log(`Service belongs to vendor: ${serviceData?.vendor_id}`);
        finalVendorId = serviceData?.vendor_id;
      }
    }

    // Check if this booking already exists
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('service_id', serviceId)
      .eq('user_id', userId)
      .eq('booking_date', new Date(bookingDate).toISOString())
      .limit(1);

    if (existingBookings && existingBookings.length > 0) {
      console.log(`Booking already exists with ID: ${existingBookings[0].id}`);
      return { success: true, bookingId: existingBookings[0].id, alreadyExists: true };
    }

    // Get current timestamp
    const now = new Date().toISOString();

    // Insert the booking record
    const bookingData = {
      service_id: serviceId,
      user_id: userId,
      status: 'confirmed',
      payment_status: 'paid',
      payment_intent: session.payment_intent as string,
      amount_paid: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      booking_date: new Date(bookingDate).toISOString(),
      vendor_id: finalVendorId,
      created_at: now,
      metadata: {
        session_id: session.id,
        customer_email: session.customer_details?.email,
        customer_name: session.customer_details?.name,
        time: new Date().toLocaleTimeString(),
        created_by: 'fallback_method'
      }
    };
    
    console.log('Creating booking record with data:', bookingData);
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (error) {
      console.error('Error creating booking record:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      throw new Error(`Failed to create booking record: ${error.message}`);
    }

    console.log(`Booking created successfully: ${booking?.id}`);
    return { success: true, bookingId: booking?.id };
  } catch (error: any) {
    console.error('Booking creation error:', error);
    throw new Error(`Booking creation failed: ${error.message}`);
  }
} 
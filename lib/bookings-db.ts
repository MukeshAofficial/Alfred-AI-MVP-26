import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export interface BookingData {
  id: string;
  service_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'rescheduled';
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
  payment_intent?: string;
  amount_paid?: number;
  currency?: string;
  booking_date?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  
  // Joined fields from services
  service_name?: string;
  service_description?: string;
  service_price?: number;
  service_currency?: string;
  service_duration?: number;
  service_category?: string;
  service_location?: string;
  service_images?: string[];
  
  // Joined fields from profiles (vendor)
  vendor_name?: string;
}

export class BookingsDB {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Get bookings for a user
  async getUserBookings(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            description,
            price,
            currency,
            duration,
            category,
            location,
            images,
            vendor_id
          ),
          vendor:services!inner(profiles:vendor_id(full_name, id))
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the joined data into a flatter structure
      return data.map(booking => {
        const service = booking.services || {};
        const vendor = booking.vendor?.profiles || {};
        
        return {
          ...booking,
          service_name: service.name,
          service_description: service.description,
          service_price: service.price,
          service_currency: service.currency,
          service_duration: service.duration,
          service_category: service.category,
          service_location: service.location,
          service_images: service.images,
          vendor_name: vendor.full_name,
          vendor_id: service.vendor_id,
          // Remove the nested objects to flatten the structure
          services: undefined,
          vendor: undefined
        };
      });
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return [];
    }
  }

  // Get bookings for a vendor
  async getVendorBookings(vendorId: string) {
    try {
      const { data, error } = await this.supabase
        .from('bookings')
        .select(`
          *,
          services:service_id!inner (
            id,
            name,
            description,
            price,
            currency,
            duration,
            category,
            location,
            images,
            vendor_id
          ),
          user:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('services.vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the joined data into a flatter structure
      return data.map(booking => {
        const service = booking.services || {};
        const user = booking.user || {};
        
        return {
          ...booking,
          service_name: service.name,
          service_description: service.description,
          service_price: service.price,
          service_currency: service.currency,
          service_duration: service.duration,
          service_category: service.category,
          service_location: service.location,
          service_images: service.images,
          user_name: user.full_name,
          user_email: user.email,
          // Remove the nested objects to flatten the structure
          services: undefined,
          user: undefined
        };
      });
    } catch (error) {
      console.error("Error fetching vendor bookings:", error);
      return [];
    }
  }

  // Get a specific booking by ID
  async getBookingById(bookingId: string) {
    try {
      const { data, error } = await this.supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (
            id,
            name,
            description,
            price,
            currency,
            duration,
            category,
            location,
            images,
            vendor_id
          ),
          vendor:services!inner(profiles:vendor_id(full_name, id)),
          user:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      const service = data.services || {};
      const vendor = data.vendor?.profiles || {};
      const user = data.user || {};
      
      return {
        ...data,
        service_name: service.name,
        service_description: service.description,
        service_price: service.price,
        service_currency: service.currency,
        service_duration: service.duration,
        service_category: service.category,
        service_location: service.location,
        service_images: service.images,
        vendor_name: vendor.full_name,
        vendor_id: service.vendor_id,
        user_name: user.full_name,
        user_email: user.email,
        // Remove the nested objects to flatten the structure
        services: undefined,
        vendor: undefined,
        user: undefined
      };
    } catch (error) {
      console.error("Error fetching booking by id:", error);
      throw error;
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId: string, status: string) {
    try {
      const { data, error } = await this.supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating booking status:", error);
      throw error;
    }
  }
} 
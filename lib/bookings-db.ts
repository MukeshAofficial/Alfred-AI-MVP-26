import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export interface BookingData {
  id: string;
  service_id: string;
  user_id: string;
  vendor_id?: string;
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
  
  // Joined fields from profiles (vendor and user)
  vendor_name?: string;
  user_name?: string;
  user_email?: string;
  
  // For the extended format
  service?: any;
  user?: any;
}

export class BookingsDB {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Get bookings for a user
  async getUserBookings(userId: string) {
    try {
      if (!userId) {
        console.error("getUserBookings called with empty userId");
        return [];
      }

      console.log(`Fetching bookings for user: ${userId}`);
      
      // First, check if the user exists
      const { data: userExists, error: userError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (userError) {
        console.error("Error confirming user exists:", userError);
        // Continue anyway, as the error might be that it's not a single result
      }
      
      console.log("Executing bookings query...");
      
      // Perform the actual bookings query with improved error handling
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
            images
          ),
          vendor:vendor_id (
            id,
            full_name,
            email
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error fetching bookings:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error message:", error.message);
        console.error("Error hint:", error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(`No bookings found for user: ${userId}`);
        return [];
      }

      console.log(`Found ${data.length} bookings for user: ${userId}`);

      // Transform the joined data into a flatter structure
      return data.map(booking => {
        const service = booking.services || {};
        const vendor = booking.vendor || {};
        
        return {
          ...booking,
          service_name: service.name || "Unnamed Service",
          service_description: service.description,
          service_price: service.price,
          service_currency: service.currency || "USD",
          service_duration: service.duration,
          service_category: service.category,
          service_location: service.location,
          service_images: service.images || [],
          vendor_name: vendor?.full_name || "Service Provider",
          // Remove the nested objects to flatten the structure
          services: undefined,
          vendor: undefined
        };
      });
    } catch (error: any) {
      console.error("Error fetching user bookings:", error);
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      return [];
    }
  }

  // Get all bookings (for admin)
  async getAllBookings() {
    try {
      console.log("Fetching all bookings for admin");
      
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
            images
          ),
          user:user_id (
            id,
            full_name,
            email
          ),
          vendor:vendor_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error fetching all bookings:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log("No bookings found in the system");
        return [];
      }

      console.log(`Found ${data.length} total bookings`);

      // Structure data with nested objects for admin view
      return data.map(booking => {
        return {
          ...booking,
          service: booking.services,
          // Keep the nested objects for more detailed admin view
          services: undefined
        };
      });
    } catch (error: any) {
      console.error("Error fetching all bookings:", error);
      console.error("Error details:", error.message);
      return [];
    }
  }

  // Get bookings for a vendor
  async getVendorBookings(vendorId: string) {
    try {
      if (!vendorId) {
        console.error("getVendorBookings called with empty vendorId");
        return [];
      }

      console.log(`Fetching bookings for vendor: ${vendorId}`);
      
      // First check if vendor exists
      const { data: vendorExists, error: vendorError } = await this.supabase
        .from('profiles')
        .select('id, role')
        .eq('id', vendorId)
        .eq('role', 'vendor')
        .single();
        
      if (vendorError) {
        console.error("Error confirming vendor exists:", vendorError);
        // Continue anyway as the error might be that it's not a single result
      } else {
        console.log("Vendor profile found:", vendorExists);
      }
      
      console.log("Executing vendor bookings query...");
      
      // Use the direct vendor_id column instead of joining through services
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
            images
          ),
          user:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase error fetching vendor bookings:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error message:", error.message);
        console.error("Error hint:", error.hint);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log(`No bookings found for vendor: ${vendorId}`);
        return [];
      }

      console.log(`Found ${data.length} bookings for vendor: ${vendorId}`);

      // Transform the joined data into a flatter structure
      return data.map(booking => {
        const service = booking.services || {};
        const user = booking.user || {};
        
        return {
          ...booking,
          service_name: service.name || "Unnamed Service",
          service_description: service.description,
          service_price: service.price,
          service_currency: service.currency || "USD",
          service_duration: service.duration,
          service_category: service.category,
          service_location: service.location,
          service_images: service.images || [],
          user_name: user.full_name || "Guest User",
          user_email: user.email || "No email provided",
          // Remove the nested objects to flatten the structure
          services: undefined,
          user: undefined
        };
      });
    } catch (error: any) {
      console.error("Error fetching vendor bookings:", error);
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      return [];
    }
  }

  // Get a specific booking by ID
  async getBookingById(bookingId: string) {
    try {
      if (!bookingId) {
        console.error("getBookingById called with empty bookingId");
        throw new Error("Booking ID is required");
      }

      console.log(`Fetching booking details for ID: ${bookingId}`);
      
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
            images
          ),
          vendor:vendor_id (
            id,
            full_name,
            email
          ),
          user:user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error("Error fetching booking details:", error);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error message:", error.message);
        throw error;
      }

      if (!data) {
        console.error(`No booking found with ID: ${bookingId}`);
        throw new Error("Booking not found");
      }

      const service = data.services || {};
      const vendor = data.vendor || {};
      const user = data.user || {};
      
      return {
        ...data,
        service_name: service.name || "Unnamed Service",
        service_description: service.description,
        service_price: service.price,
        service_currency: service.currency || "USD",
        service_duration: service.duration,
        service_category: service.category,
        service_location: service.location,
        service_images: service.images || [],
        vendor_name: vendor?.full_name || "Service Provider",
        user_name: user.full_name || "Guest User",
        user_email: user.email || "No email provided",
        // Remove the nested objects to flatten the structure
        services: undefined,
        vendor: undefined,
        user: undefined
      };
    } catch (error: any) {
      console.error("Error fetching booking by id:", error);
      console.error("Error details:", error.message);
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
      throw error;
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId: string, status: 'pending' | 'confirmed' | 'completed' | 'canceled' | 'rescheduled') {
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
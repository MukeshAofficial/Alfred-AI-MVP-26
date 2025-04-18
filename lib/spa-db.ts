import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { AdminSpa, AdminSpaService, AdminSpaBooking, SpaFormData, SpaServiceFormData, SpaBookingFormData } from "@/types/spa";

export class SpaDB {
  private supabase;
  private static instance: SpaDB;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables. Check your .env file.");
      throw new Error("Database configuration is incomplete. Missing environment variables for Supabase.");
    }

    try {
      this.supabase = createClientComponentClient();
    } catch (error) {
      console.error("Failed to create Supabase client:", error);
      throw new Error("Failed to initialize database connection.");
    }
  }

  // Create a singleton instance
  public static getInstance(): SpaDB {
    if (!SpaDB.instance) {
      SpaDB.instance = new SpaDB();
    }
    return SpaDB.instance;
  }

  // Check if required tables exist
  async checkTablesExist(): Promise<{
    allExist: boolean,
    spasExist: boolean,
    servicesExist: boolean,
    bookingsExist: boolean
  }> {
    try {
      // Check if supabase is properly initialized
      if (!this.supabase) {
        console.error('Supabase client not initialized');
        throw new Error('Database client not initialized');
      }

      // In client-side component, direct access to information_schema might not be available
      // Try to query directly against our expected tables instead
      
      // Try to query from admin_spas
      const { data: spasData, error: spasError } = await this.supabase
        .from('admin_spas')
        .select('id')
        .limit(1);
        
      // Try to query from admin_spa_services  
      const { data: servicesData, error: servicesError } = await this.supabase
        .from('admin_spa_services')
        .select('id')
        .limit(1);
        
      // Try to query from admin_spa_bookings  
      const { data: bookingsData, error: bookingsError } = await this.supabase
        .from('admin_spa_bookings')
        .select('id')
        .limit(1);
      
      // Log detailed error information
      console.log('Spa table check results:', {
        spasData: spasData ? 'exists' : 'empty',
        servicesData: servicesData ? 'exists' : 'empty',
        bookingsData: bookingsData ? 'exists' : 'empty',
        spasError: spasError ? { code: spasError.code, message: spasError.message } : null,
        servicesError: servicesError ? { code: servicesError.code, message: servicesError.message } : null,
        bookingsError: bookingsError ? { code: bookingsError.code, message: bookingsError.message } : null
      });
      
      // Check for table not found errors (PGRST116)
      const spasExist = !(spasError && spasError.code === "PGRST116");
      const servicesExist = !(servicesError && servicesError.code === "PGRST116");
      const bookingsExist = !(bookingsError && bookingsError.code === "PGRST116");
      
      // All tables exist only if all three checks pass
      const allExist = spasExist && servicesExist && bookingsExist;
        
      return {
        allExist,
        spasExist,
        servicesExist,
        bookingsExist
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking tables';
      console.error('Error checking spa tables existence:', errorMessage);
      
      // Provide a more helpful error for debugging
      throw new Error(`Failed to check spa database tables: ${errorMessage}`);
    }
  }

  // SPA MANAGEMENT
  async getAllSpas(): Promise<AdminSpa[]> {
    try {
      // Check if tables exist first
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist.allExist) {
        throw new Error("Required database tables do not exist. Please check your database setup.");
      }
      
      // First, simply get all spas without the count to ensure basic query works
      const { data, error } = await this.supabase
        .from('admin_spas')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching spas:", error);
        throw new Error(`Database error: ${error.message || 'Unknown error fetching spas'}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Now get the spas with service counts if available
      const spasWithData = await Promise.all(data.map(async (spa) => {
        try {
          // Get service count
          const serviceCountResponse = await this.supabase
            .from('admin_spa_services')
            .select('id', { count: 'exact', head: true })
            .eq('spa_id', spa.id);
          
          // Get booking count  
          const bookingCountResponse = await this.supabase
            .from('admin_spa_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('spa_id', spa.id);
          
          return {
            ...spa,
            service_count: serviceCountResponse.count || 0,
            booking_count: bookingCountResponse.count || 0
          };
        } catch (countError) {
          console.error(`Error getting counts for spa ${spa.id}:`, countError);
          // Return the spa without counts if there was an error
          return {
            ...spa,
            service_count: 0,
            booking_count: 0
          };
        }
      }));

      return spasWithData;
    } catch (error) {
      console.error("Failed to fetch spas:", error);
      if (error instanceof Error) {
        throw error; // Re-throw to preserve the error message
      }
      throw new Error('An unexpected error occurred while fetching spas');
    }
  }

  async getSpaById(id: string): Promise<AdminSpa | null> {
    try {
      // Check if tables exist first
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist.allExist) {
        throw new Error("Required database tables do not exist. Please check your database setup.");
      }
      
      // First, get the basic spa data
      const { data, error } = await this.supabase
        .from('admin_spas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching spa with id ${id}:`, error);
        throw error;
      }

      if (!data) {
        return null;
      }

      try {
        // Get service count
        const serviceCountResponse = await this.supabase
          .from('admin_spa_services')
          .select('id', { count: 'exact', head: true })
          .eq('spa_id', id);
          
        // Get booking count  
        const bookingCountResponse = await this.supabase
          .from('admin_spa_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('spa_id', id);
          
        return {
          ...data,
          service_count: serviceCountResponse.count || 0,
          booking_count: bookingCountResponse.count || 0
        };
      } catch (countError) {
        console.error(`Error getting counts for spa ${id}:`, countError);
        // Return the spa without counts if there was an error
        return {
          ...data,
          service_count: 0,
          booking_count: 0
        };
      }
    } catch (error) {
      console.error(`Failed to fetch spa with id ${id}:`, error);
      if (error instanceof Error) {
        throw error; // Re-throw to preserve the error message
      }
      throw new Error(`An unexpected error occurred while fetching spa ${id}`);
    }
  }

  async createSpa(spaData: SpaFormData): Promise<AdminSpa | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spas')
        .insert({
          name: spaData.name,
          description: spaData.description,
          location: spaData.location,
          status: spaData.status,
          opening_hours: spaData.opening_hours,
          capacity: spaData.capacity,
          amenities: spaData.amenities,
          images: spaData.images
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating spa:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Failed to create spa:", error);
      return null;
    }
  }

  async updateSpa(id: string, spaData: Partial<SpaFormData>): Promise<AdminSpa | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spas')
        .update(spaData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating spa with id ${id}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Failed to update spa with id ${id}:`, error);
      return null;
    }
  }

  async deleteSpa(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_spas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting spa with id ${id}:`, error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete spa with id ${id}:`, error);
      return false;
    }
  }

  // SPA SERVICES MANAGEMENT
  async getAllSpaServices(): Promise<AdminSpaService[]> {
    try {
      // Verify tables exist first to provide better error messages
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist.allExist) {
        console.error("Database tables don't exist when trying to fetch all services");
        throw new Error("Required database tables do not exist. Please initialize the database.");
      }

      const { data, error } = await this.supabase
        .from('admin_spa_services')
        .select(`
          *,
          spa:spa_id (
            id,
            name,
            location
          ),
          booking_count:admin_spa_bookings(count)
        `)
        .order('name', { ascending: true });

      if (error) {
        // Check for specific error types
        if (error.code === "PGRST116") {
          console.error("Table admin_spa_services not found when fetching all services");
          throw new Error("The spa services table does not exist. Please initialize the database.");
        }
        
        console.error("Error fetching spa services:", error);
        throw new Error(`Database error: ${error.message || "Unknown error"}`);
      }

      if (!data) {
        return [];
      }

      // Transform the booking counts into numbers
      const servicesWithCounts = data.map(service => ({
        ...service,
        booking_count: service.booking_count?.[0]?.count || 0
      }));

      return servicesWithCounts;
    } catch (error) {
      console.error("Failed to fetch spa services:", error);
      
      // Re-throw the error with a helpful message if it's not already an Error object
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to fetch spa services: ${JSON.stringify(error)}`);
      }
    }
  }

  async getSpaServicesBySpaId(spaId: string): Promise<AdminSpaService[]> {
    try {
      // Verify tables exist first to provide better error messages
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist.allExist) {
        console.error(`Database tables don't exist when trying to fetch services for spa ${spaId}`);
        throw new Error("Required database tables do not exist. Please initialize the database.");
      }

      const { data, error } = await this.supabase
        .from('admin_spa_services')
        .select(`
          *,
          booking_count:admin_spa_bookings(count)
        `)
        .eq('spa_id', spaId)
        .order('name', { ascending: true });

      if (error) {
        // Check for specific error types
        if (error.code === "PGRST116") {
          console.error(`Table admin_spa_services not found when fetching services for spa ${spaId}`);
          throw new Error("The spa services table does not exist. Please initialize the database.");
        }
        
        console.error(`Error fetching spa services for spa ${spaId}:`, error);
        throw new Error(`Database error: ${error.message || "Unknown error"}`);
      }

      if (!data) {
        return [];
      }

      // Transform the booking counts into numbers
      const servicesWithCounts = data.map(service => ({
        ...service,
        booking_count: service.booking_count?.[0]?.count || 0
      }));

      return servicesWithCounts;
    } catch (error) {
      console.error(`Failed to fetch spa services for spa ${spaId}:`, error);
      
      // Re-throw the error with a helpful message if it's not already an Error object
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Failed to fetch spa services: ${JSON.stringify(error)}`);
      }
    }
  }

  async getSpaServiceById(id: string): Promise<AdminSpaService | null> {
    try {
      // Verify tables exist first to provide better error messages
      const tablesExist = await this.checkTablesExist();
      if (!tablesExist.allExist) {
        console.error(`Database tables don't exist when trying to fetch service ${id}`);
        throw new Error("Required database tables do not exist. Please initialize the database.");
      }
      
      const { data, error } = await this.supabase
        .from('admin_spa_services')
        .select(`
          *,
          spa:spa_id (
            id,
            name,
            location
          ),
          booking_count:admin_spa_bookings(count)
        `)
        .eq('id', id)
        .single();

      if (error) {
        // Check for specific error types
        if (error.code === "PGRST116") {
          console.error(`Table admin_spa_services not found when fetching service ${id}`);
          throw new Error("The spa services table does not exist. Please initialize the database.");
        }
        
        console.error(`Error fetching spa service with id ${id}:`, error);
        throw new Error(`Database error: ${error.message || "Unknown error"}`);
      }

      // Transform the booking count into a number
      if (data) {
        return {
          ...data,
          booking_count: data.booking_count?.[0]?.count || 0
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch spa service with id ${id}:`, error);
      
      // Re-throw if it's a known error type
      if (error instanceof Error) {
        if (error.message.includes("database") || error.message.includes("table")) {
          throw error;
        }
      }
      
      // Otherwise return null to maintain backward compatibility
      return null;
    }
  }

  async createSpaService(serviceData: SpaServiceFormData): Promise<AdminSpaService | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_services')
        .insert({
          spa_id: serviceData.spa_id,
          name: serviceData.name,
          description: serviceData.description,
          price: serviceData.price,
          currency: serviceData.currency,
          duration: serviceData.duration,
          status: serviceData.status,
          therapists: serviceData.therapists,
          special_requirements: serviceData.special_requirements,
          images: serviceData.images
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating spa service:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Failed to create spa service:", error);
      return null;
    }
  }

  async updateSpaService(id: string, serviceData: Partial<SpaServiceFormData>): Promise<AdminSpaService | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating spa service with id ${id}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Failed to update spa service with id ${id}:`, error);
      return null;
    }
  }

  async deleteSpaService(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_spa_services')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting spa service with id ${id}:`, error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete spa service with id ${id}:`, error);
      return false;
    }
  }

  // SPA BOOKINGS MANAGEMENT
  async getAllSpaBookings(): Promise<AdminSpaBooking[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .select(`
          *,
          spa:spa_id (
            id,
            name,
            location
          ),
          service:service_id (
            id,
            name,
            price,
            currency,
            duration
          )
        `)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error("Error fetching spa bookings:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch spa bookings:", error);
      return [];
    }
  }

  async getSpaBookingsBySpaId(spaId: string): Promise<AdminSpaBooking[]> {
    try {
      // Check if specific tables exist
      const tableStatus = await this.checkTablesExist();
      
      // If bookings table specifically doesn't exist, return empty array with a clearer error
      if (!tableStatus.bookingsExist) {
        console.warn(`The admin_spa_bookings table does not exist yet. Need to initialize the database fully.`);
        return [];
      }
      
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .select(`
          *,
          service:service_id (
            id,
            name,
            price,
            currency,
            duration
          )
        `)
        .eq('spa_id', spaId)
        .order('booking_date', { ascending: false });

      if (error) {
        // Check for specific error types
        if (error.code === "PGRST116" || error.message.includes("relation") || error.message.includes("does not exist")) {
          console.error(`Table admin_spa_bookings not found when fetching bookings for spa ${spaId}`);
          return []; // Return empty array instead of throwing to prevent UI breaking
        }
        
        console.error(`Error fetching spa bookings for spa ${spaId}:`, error);
        throw new Error(`Database error when fetching bookings: ${error.message || "Unknown error"}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to fetch spa bookings for spa ${spaId}:`, error);
      return []; // Return empty array instead of throwing to prevent UI breaking
    }
  }

  async getSpaBookingsByServiceId(serviceId: string): Promise<AdminSpaBooking[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .select(`
          *,
          spa:spa_id (
            id,
            name,
            location
          )
        `)
        .eq('service_id', serviceId)
        .order('booking_date', { ascending: false });

      if (error) {
        console.error(`Error fetching spa bookings for service ${serviceId}:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to fetch spa bookings for service ${serviceId}:`, error);
      return [];
    }
  }

  async getSpaBookingById(id: string): Promise<AdminSpaBooking | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .select(`
          *,
          spa:spa_id (
            id,
            name,
            location
          ),
          service:service_id (
            id,
            name,
            price,
            currency,
            duration
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error fetching spa booking with id ${id}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch spa booking with id ${id}:`, error);
      return null;
    }
  }

  async createSpaBooking(bookingData: SpaBookingFormData): Promise<AdminSpaBooking | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .insert({
          spa_id: bookingData.spa_id,
          service_id: bookingData.service_id,
          guest_id: bookingData.guest_id,
          booking_date: bookingData.booking_date,
          status: bookingData.status,
          payment_status: bookingData.payment_status,
          guest_name: bookingData.guest_name,
          guest_email: bookingData.guest_email,
          guest_phone: bookingData.guest_phone,
          special_requests: bookingData.special_requests,
          therapist_assigned: bookingData.therapist_assigned
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating spa booking:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Failed to create spa booking:", error);
      return null;
    }
  }

  async updateSpaBooking(id: string, bookingData: Partial<SpaBookingFormData>): Promise<AdminSpaBooking | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_spa_bookings')
        .update(bookingData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating spa booking with id ${id}:`, error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`Failed to update spa booking with id ${id}:`, error);
      return null;
    }
  }

  async deleteSpaBooking(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_spa_bookings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting spa booking with id ${id}:`, error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete spa booking with id ${id}:`, error);
      return false;
    }
  }

  // STATISTICS AND ANALYTICS
  async getSpaEarningStats(spaId: string): Promise<any> {
    try {
      // Check if specific tables exist
      const tableStatus = await this.checkTablesExist();
      
      // If bookings table specifically doesn't exist, return default data with a clearer error
      if (!tableStatus.bookingsExist) {
        console.warn(`The admin_spa_bookings table does not exist yet. Need to initialize the database fully.`);
        return {
          totalEarnings: 0,
          completedBookings: 0,
          upcomingBookings: 0,
          earningsByMonth: this.getDefaultMonthlyEarnings(),
          topServices: [],
          missingTables: true
        };
      }
      
      // Calculate total earnings, upcoming and completed bookings
      const { data: bookings, error: bookingsError } = await this.supabase
        .from('admin_spa_bookings')
        .select(`
          id,
          amount_paid,
          currency,
          status,
          payment_status,
          booking_date
        `)
        .eq('spa_id', spaId);

      if (bookingsError) {
        // Check for specific error types related to missing tables
        if (bookingsError.code === "42P01" || 
            bookingsError.message.includes("relation") || 
            bookingsError.message.includes("does not exist")) {
          console.error(`Table admin_spa_bookings not found when fetching stats for spa ${spaId}`);
          return {
            totalEarnings: 0,
            completedBookings: 0,
            upcomingBookings: 0,
            earningsByMonth: this.getDefaultMonthlyEarnings(),
            topServices: [],
            missingTables: true
          };
        }
        
        console.error(`Error fetching spa bookings for stats ${spaId}:`, bookingsError);
        throw bookingsError;
      }

      // Extract relevant statistics
      const totalEarnings = bookings
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, booking) => sum + (booking.amount_paid || 0), 0);

      const completedBookings = bookings.filter(b => b.status === 'completed').length;
      const upcomingBookings = bookings.filter(b => 
        ['pending', 'confirmed'].includes(b.status) && 
        new Date(b.booking_date) > new Date()
      ).length;

      // Group earnings by month for the chart
      const earningsByMonth = this.getMonthlyEarnings(bookings);

      try {
        // Get top services by bookings count - can still work even if no bookings
        const { data: services, error: servicesError } = await this.supabase
          .from('admin_spa_services')
          .select(`
            id,
            name,
            booking_count:admin_spa_bookings(count)
          `)
          .eq('spa_id', spaId)
          .order('name');

        if (servicesError) {
          // Handle missing relationship error gracefully
          if (servicesError.code === "PGRST200" || 
              servicesError.message.includes("relationship") || 
              servicesError.message.includes("foreign key")) {
            console.warn(`Relationship error between services and bookings for spa ${spaId}`);
            return {
              totalEarnings,
              completedBookings,
              upcomingBookings,
              earningsByMonth,
              topServices: [],
              partialData: true
            };
          }
          
          console.error(`Error fetching spa services for stats ${spaId}:`, servicesError);
          throw servicesError;
        }

        const topServices = services
          .map(service => ({
            name: service.name,
            bookings: service.booking_count && service.booking_count[0] ? service.booking_count[0].count || 0 : 0
          }))
          .sort((a, b) => b.bookings - a.bookings)
          .slice(0, 5);

        return {
          totalEarnings,
          completedBookings,
          upcomingBookings,
          earningsByMonth,
          topServices
        };
      } catch (serviceError) {
        // Still return partial data if services part fails
        console.error(`Error getting service stats for spa ${spaId}:`, serviceError);
        return {
          totalEarnings,
          completedBookings,
          upcomingBookings,
          earningsByMonth,
          topServices: [],
          partialData: true
        };
      }
    } catch (error) {
      console.error(`Failed to fetch spa earning stats for ${spaId}:`, error);
      return {
        totalEarnings: 0,
        completedBookings: 0,
        upcomingBookings: 0,
        earningsByMonth: this.getDefaultMonthlyEarnings(),
        topServices: [],
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  
  // Helper method to get default monthly earnings data
  private getDefaultMonthlyEarnings() {
    const currentDate = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(currentDate.getMonth() - i);
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        earnings: 0
      };
    }).reverse();
    
    return last6Months;
  }
  
  // Helper method to calculate earnings by month
  private getMonthlyEarnings(bookings: any[]) {
    const currentDate = new Date();
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(currentDate.getMonth() - i);
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        yearMonth: `${d.getFullYear()}-${d.getMonth() + 1}`
      };
    }).reverse();

    return last6Months.map(monthData => {
      const monthEarnings = bookings
        .filter(b => {
          const bookingDate = new Date(b.booking_date);
          return bookingDate.getMonth() === monthData.monthIndex && 
                 bookingDate.getFullYear() === monthData.year &&
                 b.payment_status === 'paid';
        })
        .reduce((sum, booking) => sum + (booking.amount_paid || 0), 0);

      return {
        month: monthData.month,
        year: monthData.year,
        earnings: monthEarnings
      };
    });
  }

  // Create necessary database tables
  async runSetupScripts(): Promise<{success: boolean, message: string, created: string[]}> {
    try {
      // Check which tables exist
      const tableStatus = await this.checkTablesExist();
      const createdTables = [];
      
      // If all tables already exist, return success
      if (tableStatus.allExist) {
        return { 
          success: true, 
          message: "All database tables already exist.",
          created: []
        };
      }
      
      // 1. Create admin_spas table if needed
      if (!tableStatus.spasExist) {
        console.log("Creating admin_spas table...");
        const { error: spaTableError } = await this.supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.admin_spas (
              id UUID NOT NULL DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              description TEXT NOT NULL,
              location TEXT NOT NULL,
              images TEXT[] NULL,
              opening_hours JSONB NOT NULL,
              capacity INTEGER NULL,
              amenities TEXT[] NULL,
              status TEXT NOT NULL DEFAULT 'active',
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              CONSTRAINT admin_spas_pkey PRIMARY KEY (id),
              CONSTRAINT admin_spas_status_check CHECK (
                (
                  status = ANY (
                    ARRAY['active'::TEXT, 'inactive'::TEXT, 'maintenance'::TEXT]
                  )
                )
              )
            );
            
            CREATE INDEX IF NOT EXISTS admin_spas_status_idx ON public.admin_spas USING btree (status);
          `
        });
        
        if (spaTableError) {
          throw new Error(`Failed to create admin_spas table: ${spaTableError.message}`);
        }
        
        createdTables.push('admin_spas');
      }
      
      // 2. Create admin_spa_services table if needed
      if (!tableStatus.servicesExist) {
        console.log("Creating admin_spa_services table...");
        const { error: serviceTableError } = await this.supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.admin_spa_services (
              id UUID NOT NULL DEFAULT gen_random_uuid(),
              spa_id UUID NOT NULL,
              name TEXT NOT NULL,
              description TEXT NOT NULL,
              price NUMERIC NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD'::TEXT,
              duration INTEGER NULL,
              images TEXT[] NULL,
              status TEXT NOT NULL DEFAULT 'available'::TEXT,
              therapists TEXT[] NULL,
              special_requirements TEXT NULL,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              CONSTRAINT admin_spa_services_pkey PRIMARY KEY (id),
              CONSTRAINT admin_spa_services_spa_id_fkey FOREIGN KEY (spa_id) REFERENCES admin_spas (id) ON DELETE CASCADE,
              CONSTRAINT admin_spa_services_price_check CHECK (price >= 0),
              CONSTRAINT admin_spa_services_status_check CHECK (
                (
                  status = ANY (
                    ARRAY['available'::TEXT, 'unavailable'::TEXT, 'featured'::TEXT]
                  )
                )
              )
            );
            
            CREATE INDEX IF NOT EXISTS admin_spa_services_spa_id_idx ON public.admin_spa_services USING btree (spa_id);
            CREATE INDEX IF NOT EXISTS admin_spa_services_status_idx ON public.admin_spa_services USING btree (status);
          `
        });
        
        if (serviceTableError) {
          throw new Error(`Failed to create admin_spa_services table: ${serviceTableError.message}`);
        }
        
        createdTables.push('admin_spa_services');
      }
      
      // 3. Create admin_spa_bookings table if needed
      if (!tableStatus.bookingsExist) {
        console.log("Creating admin_spa_bookings table...");
        const { error: bookingTableError } = await this.supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.admin_spa_bookings (
              id UUID NOT NULL DEFAULT gen_random_uuid(),
              spa_id UUID NOT NULL,
              service_id UUID NOT NULL,
              guest_id UUID NOT NULL,
              booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
              status TEXT NOT NULL DEFAULT 'pending',
              payment_status TEXT NOT NULL DEFAULT 'unpaid',
              payment_intent TEXT NULL,
              amount_paid NUMERIC NULL,
              currency TEXT NULL DEFAULT 'USD'::TEXT,
              guest_name TEXT NOT NULL,
              guest_email TEXT NULL,
              guest_phone TEXT NULL,
              special_requests TEXT NULL,
              therapist_assigned TEXT NULL,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              CONSTRAINT admin_spa_bookings_pkey PRIMARY KEY (id),
              CONSTRAINT admin_spa_bookings_spa_id_fkey FOREIGN KEY (spa_id) REFERENCES admin_spas (id) ON DELETE CASCADE,
              CONSTRAINT admin_spa_bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES admin_spa_services (id) ON DELETE CASCADE,
              CONSTRAINT admin_spa_bookings_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES profiles (id) ON DELETE CASCADE,
              CONSTRAINT admin_spa_bookings_status_check CHECK (
                (
                  status = ANY (
                    ARRAY['pending'::TEXT, 'confirmed'::TEXT, 'completed'::TEXT, 'cancelled'::TEXT, 'rescheduled'::TEXT]
                  )
                )
              ),
              CONSTRAINT admin_spa_bookings_payment_status_check CHECK (
                (
                  payment_status = ANY (
                    ARRAY['unpaid'::TEXT, 'paid'::TEXT, 'refunded'::TEXT, 'failed'::TEXT]
                  )
                )
              )
            );
            
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_spa_id_idx ON public.admin_spa_bookings USING btree (spa_id);
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_service_id_idx ON public.admin_spa_bookings USING btree (service_id);
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_guest_id_idx ON public.admin_spa_bookings USING btree (guest_id);
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_status_idx ON public.admin_spa_bookings USING btree (status);
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_payment_status_idx ON public.admin_spa_bookings USING btree (payment_status);
            CREATE INDEX IF NOT EXISTS admin_spa_bookings_booking_date_idx ON public.admin_spa_bookings USING btree (booking_date);
          `
        });
        
        if (bookingTableError) {
          throw new Error(`Failed to create admin_spa_bookings table: ${bookingTableError.message}`);
        }
        
        createdTables.push('admin_spa_bookings');
      }
      
      // Verify that tables were created successfully
      const tablesCreated = await this.checkTablesExist();
      
      // Generate appropriate message
      let message;
      if (createdTables.length === 0) {
        message = "No tables needed to be created.";
      } else if (tablesCreated.allExist) {
        message = `Successfully created tables: ${createdTables.join(', ')}.`;
      } else {
        const missingTables = [];
        if (!tablesCreated.spasExist) missingTables.push('admin_spas');
        if (!tablesCreated.servicesExist) missingTables.push('admin_spa_services');
        if (!tablesCreated.bookingsExist) missingTables.push('admin_spa_bookings');
        
        message = `Created tables: ${createdTables.join(', ')}, but still missing: ${missingTables.join(', ')}.`;
      }
      
      return {
        success: tablesCreated.allExist,
        message,
        created: createdTables
      };
    } catch (error) {
      console.error("Error creating database tables:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error creating database tables.",
        created: []
      };
    }
  }
} 
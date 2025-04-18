import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { AdminRestaurant, AdminRestaurantMenuItem, AdminRestaurantTable, AdminRestaurantBooking, RestaurantFormData, RestaurantMenuItemFormData, RestaurantTableFormData, RestaurantBookingFormData, AdminRestaurantReview, AdminRestaurantOffer } from '@/types/restaurant'

export class RestaurantDB {
  private supabase;
  private static instance: RestaurantDB;

  constructor() {
    try {
      this.supabase = createClientComponentClient();
    } catch (error) {
      console.error("Failed to create Supabase client:", error);
      throw new Error("Failed to initialize database connection.");
    }
  }

  public static getInstance(): RestaurantDB {
    if (!RestaurantDB.instance) {
      RestaurantDB.instance = new RestaurantDB()
    }
    return RestaurantDB.instance
  }

  async checkTablesExist(): Promise<{
    allExist: boolean,
    restaurantsExist: boolean,
    menuItemsExist: boolean,
    tablesExist: boolean,
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
      
      // Try to query from admin_restaurants
      const { data: restaurantsData, error: restaurantsError } = await this.supabase
        .from('admin_restaurants')
        .select('id')
        .limit(1);

      // Try to query from admin_restaurant_menu_items
      const { data: menuItemsData, error: menuItemsError } = await this.supabase
        .from('admin_restaurant_menu_items')
        .select('id')
        .limit(1);

      // Try to query from admin_restaurant_tables
      const { data: tablesData, error: tablesError } = await this.supabase
        .from('admin_restaurant_tables')
        .select('id')
        .limit(1);

      // Try to query from admin_restaurant_bookings
      const { data: bookingsData, error: bookingsError } = await this.supabase
        .from('admin_restaurant_bookings')
        .select('id')
        .limit(1);

      console.log('Restaurant table check results:', {
        restaurantsData: restaurantsData ? 'exists' : 'empty',
        menuItemsData: menuItemsData ? 'exists' : 'empty',
        tablesData: tablesData ? 'exists' : 'empty',
        bookingsData: bookingsData ? 'exists' : 'empty',
        restaurantsError: restaurantsError ? { code: restaurantsError.code, message: restaurantsError.message } : null,
        menuItemsError: menuItemsError ? { code: menuItemsError.code, message: menuItemsError.message } : null,
        tablesError: tablesError ? { code: tablesError.code, message: tablesError.message } : null,
        bookingsError: bookingsError ? { code: bookingsError.code, message: bookingsError.message } : null
      });

      // Check if tables exist based on errors
      // Table exists if we don't get a "not found" error (PGRST116)
      const restaurantsExist = !(restaurantsError && restaurantsError.code === 'PGRST116');
      const menuItemsExist = !(menuItemsError && menuItemsError.code === 'PGRST116');
      const tablesExist = !(tablesError && tablesError.code === 'PGRST116');
      const bookingsExist = !(bookingsError && bookingsError.code === 'PGRST116');

      // All tables exist only if all checks pass
      const allExist = restaurantsExist && menuItemsExist && tablesExist && bookingsExist;

      return {
        allExist,
        restaurantsExist,
        menuItemsExist,
        tablesExist,
        bookingsExist
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking tables';
      console.error('Error checking tables existence:', errorMessage);
      
      // Provide a more helpful error for debugging
      throw new Error(`Failed to check database tables: ${errorMessage}`);
    }
  }

  // RESTAURANT OPERATIONS
  async getAllRestaurants(): Promise<AdminRestaurant[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.restaurantsExist) {
        console.warn('Restaurants table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching restaurants:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllRestaurants:', error)
      throw error
    }
  }

  async getRestaurantById(id: string): Promise<AdminRestaurant | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.restaurantsExist) {
        console.warn('Restaurants table does not exist.');
        return null;
      }

      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .select(`
          *,
          menu_items:admin_restaurant_menu_items(count),
          tables:admin_restaurant_tables(count),
          bookings:admin_restaurant_bookings(count)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 is error code for "Not found"
          return null
        }
        console.error(`Error fetching restaurant with id ${id}:`, error)
        throw error
      }

      if (data) {
        // Transform the counts from the joins into the expected format
        const restaurant: AdminRestaurant = {
          id: data.id,
          name: data.name,
          description: data.description,
          location: data.location,
          images: data.images,
          opening_hours: data.opening_hours,
          cuisine_type: data.cuisine_type,
          price_range: data.price_range,
          capacity: data.capacity,
          features: data.features,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
          menu_count: data.menu_items?.[0]?.count || 0,
          table_count: data.tables?.[0]?.count || 0,
          booking_count: data.bookings?.[0]?.count || 0
        }

        return restaurant
      }

      return null
    } catch (error) {
      console.error(`Error in getRestaurantById for id ${id}:`, error)
      throw error
    }
  }

  async createRestaurant(restaurantData: RestaurantFormData): Promise<AdminRestaurant | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.restaurantsExist) {
        console.warn('Restaurants table does not exist. Running setup scripts.');
        const setupResult = await this.runSetupScripts();
        if (!setupResult.success) {
          throw new Error('Failed to set up database tables for restaurants');
        }
      }

      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .insert(restaurantData)
        .select()
        .single()

      if (error) {
        console.error('Error creating restaurant:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createRestaurant:', error)
      throw error
    }
  }

  async updateRestaurant(id: string, restaurantData: Partial<RestaurantFormData>): Promise<AdminRestaurant | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .update(restaurantData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating restaurant with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurant for id ${id}:`, error)
      throw error
    }
  }

  async deleteRestaurant(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurants')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Error deleting restaurant with id ${id}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurant for id ${id}:`, error)
      throw error
    }
  }

  // MENU ITEM OPERATIONS
  async getAllRestaurantMenuItems(): Promise<AdminRestaurantMenuItem[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.menuItemsExist) {
        console.warn('Menu items table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching menu items:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllRestaurantMenuItems:', error)
      throw error
    }
  }

  async getRestaurantMenuItemsByRestaurantId(restaurantId: string): Promise<AdminRestaurantMenuItem[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.menuItemsExist) {
        console.warn('Menu items table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location)
        `)
        .eq('restaurant_id', restaurantId)
        .order('category', { ascending: true })
        .order('price', { ascending: true })

      if (error) {
        console.error(`Error fetching menu items for restaurant ${restaurantId}:`, error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error(`Error in getRestaurantMenuItemsByRestaurantId for restaurant ${restaurantId}:`, error)
      throw error
    }
  }

  async getRestaurantMenuItemById(id: string): Promise<AdminRestaurantMenuItem | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.menuItemsExist) {
        console.warn('Menu items table does not exist.');
        return null;
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .select(`
          *,
          restaurant:admin_restaurants(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        console.error(`Error fetching menu item with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in getRestaurantMenuItemById for id ${id}:`, error)
      throw error
    }
  }

  async createRestaurantMenuItem(menuItemData: RestaurantMenuItemFormData): Promise<AdminRestaurantMenuItem | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.menuItemsExist) {
        console.warn('Menu items table does not exist. Running setup scripts.');
        const setupResult = await this.runSetupScripts();
        if (!setupResult.success) {
          throw new Error('Failed to set up database tables for menu items');
        }
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .insert(menuItemData)
        .select()
        .single()

      if (error) {
        console.error('Error creating menu item:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createRestaurantMenuItem:', error)
      throw error
    }
  }

  async updateRestaurantMenuItem(id: string, menuItemData: Partial<RestaurantMenuItemFormData>): Promise<AdminRestaurantMenuItem | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .update(menuItemData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating menu item with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurantMenuItem for id ${id}:`, error)
      throw error
    }
  }

  async deleteRestaurantMenuItem(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurant_menu_items')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Error deleting menu item with id ${id}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurantMenuItem for id ${id}:`, error)
      throw error
    }
  }

  // TABLE OPERATIONS
  async getAllRestaurantTables(): Promise<AdminRestaurantTable[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.tablesExist) {
        console.warn('Tables table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_tables')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location)
        `)
        .order('restaurant_id', { ascending: true })
        .order('table_number', { ascending: true })

      if (error) {
        console.error('Error fetching tables:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllRestaurantTables:', error)
      throw error
    }
  }

  async getRestaurantTablesByRestaurantId(restaurantId: string): Promise<AdminRestaurantTable[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.tablesExist) {
        console.warn('Tables table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_tables')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location)
        `)
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true })

      if (error) {
        console.error(`Error fetching tables for restaurant ${restaurantId}:`, error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error(`Error in getRestaurantTablesByRestaurantId for restaurant ${restaurantId}:`, error)
      throw error
    }
  }

  async getRestaurantTableById(id: string): Promise<AdminRestaurantTable | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.tablesExist) {
        console.warn('Tables table does not exist.');
        return null;
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_tables')
        .select(`
          *,
          restaurant:admin_restaurants(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        console.error(`Error fetching table with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in getRestaurantTableById for id ${id}:`, error)
      throw error
    }
  }

  async createRestaurantTable(tableData: RestaurantTableFormData): Promise<AdminRestaurantTable | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.tablesExist) {
        console.warn('Tables table does not exist. Running setup scripts.');
        const setupResult = await this.runSetupScripts();
        if (!setupResult.success) {
          throw new Error('Failed to set up database tables for restaurant tables');
        }
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_tables')
        .insert(tableData)
        .select()
        .single()

      if (error) {
        console.error('Error creating table:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createRestaurantTable:', error)
      throw error
    }
  }

  async updateRestaurantTable(id: string, tableData: Partial<RestaurantTableFormData>): Promise<AdminRestaurantTable | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_tables')
        .update(tableData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating table with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurantTable for id ${id}:`, error)
      throw error
    }
  }

  async deleteRestaurantTable(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurant_tables')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Error deleting table with id ${id}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurantTable for id ${id}:`, error)
      throw error
    }
  }

  // BOOKING OPERATIONS
  async getAllRestaurantBookings(): Promise<AdminRestaurantBooking[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.bookingsExist) {
        console.warn('Bookings table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location),
          table:admin_restaurant_tables(id, table_number, seats)
        `)
        .order('booking_date', { ascending: false })

      if (error) {
        console.error('Error fetching bookings:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getAllRestaurantBookings:', error)
      throw error
    }
  }

  async getRestaurantBookingsByRestaurantId(restaurantId: string): Promise<AdminRestaurantBooking[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.bookingsExist) {
        console.warn('Bookings table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location),
          table:admin_restaurant_tables(id, table_number, seats)
        `)
        .eq('restaurant_id', restaurantId)
        .order('booking_date', { ascending: false })

      if (error) {
        console.error(`Error fetching bookings for restaurant ${restaurantId}:`, error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error(`Error in getRestaurantBookingsByRestaurantId for restaurant ${restaurantId}:`, error)
      throw error
    }
  }

  async getRestaurantBookingsByGuestId(guestId: string): Promise<AdminRestaurantBooking[]> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.bookingsExist) {
        console.warn('Bookings table does not exist.');
        return [];
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .select(`
          *,
          restaurant:admin_restaurants(id, name, location, images),
          table:admin_restaurant_tables(id, table_number, seats)
        `)
        .eq('guest_id', guestId)
        .order('booking_date', { ascending: false })

      if (error) {
        console.error(`Error fetching bookings for guest ${guestId}:`, error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error(`Error in getRestaurantBookingsByGuestId for guest ${guestId}:`, error)
      throw error
    }
  }

  async getRestaurantBookingById(id: string): Promise<AdminRestaurantBooking | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.bookingsExist) {
        console.warn('Bookings table does not exist.');
        return null;
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .select(`
          *,
          restaurant:admin_restaurants(*),
          table:admin_restaurant_tables(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        console.error(`Error fetching booking with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in getRestaurantBookingById for id ${id}:`, error)
      throw error
    }
  }

  async createRestaurantBooking(bookingData: RestaurantBookingFormData): Promise<AdminRestaurantBooking | null> {
    try {
      // Check if table exists first
      const tablesStatus = await this.checkTablesExist();
      if (!tablesStatus.bookingsExist) {
        console.warn('Bookings table does not exist. Running setup scripts.');
        const setupResult = await this.runSetupScripts();
        if (!setupResult.success) {
          throw new Error('Failed to set up database tables for bookings');
        }
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .insert(bookingData)
        .select()
        .single()

      if (error) {
        console.error('Error creating booking:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createRestaurantBooking:', error)
      throw error
    }
  }

  async updateRestaurantBooking(id: string, bookingData: Partial<RestaurantBookingFormData>): Promise<AdminRestaurantBooking | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_bookings')
        .update(bookingData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(`Error updating booking with id ${id}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurantBooking for id ${id}:`, error)
      throw error
    }
  }

  async deleteRestaurantBooking(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurant_bookings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error(`Error deleting booking with id ${id}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurantBooking for id ${id}:`, error)
      throw error
    }
  }

  // DB SETUP
  async runSetupScripts(): Promise<{success: boolean, message: string, created: string[]}> {
    try {
      // Read the SQL setup scripts from local storage
      // Since we can't directly read files from the server in Next.js API routes,
      // we'll execute a pre-defined SQL script that should be loaded into the database
      // This is a simplified version; in a real app you might want to use migrations
      
      const { data, error } = await this.supabase.rpc('execute_restaurant_setup_scripts')

      if (error) {
        console.error('Error running setup scripts:', error)
        return {
          success: false,
          message: `Failed to run setup scripts: ${error.message}`,
          created: []
        }
      }

      return {
        success: true,
        message: 'Successfully set up restaurant database tables',
        created: ['admin_restaurants', 'admin_restaurant_menu_items', 'admin_restaurant_tables', 'admin_restaurant_bookings']
      }
    } catch (error: any) {
      console.error('Error in runSetupScripts:', error)
      return {
        success: false,
        message: `Error running setup scripts: ${error.message}`,
        created: []
      }
    }
  }

  // Initialize sample menu data
  async initSampleMenuData(): Promise<{success: boolean, message: string}> {
    try {
      // Call the database RPC function to initialize the restaurant with sample menu
      const { data, error } = await this.supabase.rpc('rpc_initialize_sample_restaurant')

      if (error) {
        console.error('Error initializing sample menu data:', error)
        return {
          success: false,
          message: `Failed to initialize sample menu data: ${error.message}`
        }
      }

      // Check the response from the RPC function
      if (data && data.success === true) {
        return {
          success: true,
          message: `Successfully initialized sample restaurant with ${data.menu_items_count} menu items`
        }
      }
      
      return {
        success: false,
        message: data?.message || 'Unknown error initializing sample menu data'
      }
    } catch (error: any) {
      console.error('Error in initSampleMenuData:', error)
      return {
        success: false,
        message: `Error initializing sample menu data: ${error.message}`
      }
    }
  }

  // Enhanced restaurant methods
  async getRestaurantReviews(restaurantId: string): Promise<AdminRestaurantReview[]> {
    try {
      // Check if the table exists
      const { data: tableExists, error: tableError } = await this.supabase
        .from('admin_restaurant_reviews')
        .select('id')
        .limit(1)

      if (tableError) {
        console.error('Error checking if admin_restaurant_reviews table exists:', tableError)
        return []
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_reviews')
        .select(`
          *,
          profiles:reviewer_id (
            full_name,
            avatar_url
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('review_date', { ascending: false })

      if (error) {
        console.error(`Error fetching reviews for restaurant ${restaurantId}:`, error)
        throw error
      }

      // Map to include reviewer name and avatar
      return data.map(review => ({
        ...review,
        reviewer_name: review.profiles?.full_name || 'Anonymous',
        reviewer_avatar: review.profiles?.avatar_url
      }))
    } catch (error) {
      console.error(`Error in getRestaurantReviews for restaurant ${restaurantId}:`, error)
      return []
    }
  }

  async addRestaurantReview(reviewData: {
    restaurant_id: string;
    reviewer_id: string;
    rating: number;
    review_text?: string;
  }): Promise<AdminRestaurantReview | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_reviews')
        .insert(reviewData)
        .select()
        .single()

      if (error) {
        console.error('Error adding restaurant review:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in addRestaurantReview:', error)
      throw error
    }
  }

  async updateRestaurantReview(
    reviewId: string,
    updateData: Partial<AdminRestaurantReview>
  ): Promise<AdminRestaurantReview | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_reviews')
        .update(updateData)
        .eq('id', reviewId)
        .select()
        .single()

      if (error) {
        console.error(`Error updating review with id ${reviewId}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurantReview for id ${reviewId}:`, error)
      throw error
    }
  }

  async deleteRestaurantReview(reviewId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurant_reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error(`Error deleting review with id ${reviewId}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurantReview for id ${reviewId}:`, error)
      throw error
    }
  }

  // Restaurant Offers methods
  async getRestaurantOffers(restaurantId: string): Promise<AdminRestaurantOffer[]> {
    try {
      // Check if the table exists
      const { data: tableExists, error: tableError } = await this.supabase
        .from('admin_restaurant_offers')
        .select('id')
        .limit(1)

      if (tableError) {
        console.error('Error checking if admin_restaurant_offers table exists:', tableError)
        return []
      }

      const { data, error } = await this.supabase
        .from('admin_restaurant_offers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error(`Error fetching offers for restaurant ${restaurantId}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in getRestaurantOffers for restaurant ${restaurantId}:`, error)
      return []
    }
  }

  async addRestaurantOffer(offerData: Partial<AdminRestaurantOffer>): Promise<AdminRestaurantOffer | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_offers')
        .insert(offerData)
        .select()
        .single()

      if (error) {
        console.error('Error adding restaurant offer:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in addRestaurantOffer:', error)
      throw error
    }
  }

  async updateRestaurantOffer(
    offerId: string,
    updateData: Partial<AdminRestaurantOffer>
  ): Promise<AdminRestaurantOffer | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurant_offers')
        .update(updateData)
        .eq('id', offerId)
        .select()
        .single()

      if (error) {
        console.error(`Error updating offer with id ${offerId}:`, error)
        throw error
      }

      return data
    } catch (error) {
      console.error(`Error in updateRestaurantOffer for id ${offerId}:`, error)
      throw error
    }
  }

  async deleteRestaurantOffer(offerId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('admin_restaurant_offers')
        .delete()
        .eq('id', offerId)

      if (error) {
        console.error(`Error deleting offer with id ${offerId}:`, error)
        throw error
      }

      return true
    } catch (error) {
      console.error(`Error in deleteRestaurantOffer for id ${offerId}:`, error)
      throw error
    }
  }

  // Enhanced Restaurant Functions
  async createEnhancedRestaurant(restaurantData: RestaurantFormData): Promise<AdminRestaurant | null> {
    try {
      // Prepare data for insertion
      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .insert({
          name: restaurantData.name,
          description: restaurantData.description,
          location: restaurantData.location,
          opening_hours: restaurantData.opening_hours,
          cuisine_type: restaurantData.cuisine_type,
          price_range: restaurantData.price_range,
          capacity: restaurantData.capacity,
          features: restaurantData.features,
          status: restaurantData.status,
          image_urls: restaurantData.image_urls || restaurantData.images,
          is_featured: restaurantData.is_featured || false,
          dietary_options: restaurantData.dietary_options,
          mealtimes: restaurantData.mealtimes,
          website: restaurantData.website,
          phone: restaurantData.phone,
          social_media: restaurantData.social_media
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating enhanced restaurant:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in createEnhancedRestaurant:', error)
      // Fallback to regular create if enhanced create fails
      return this.createRestaurant(restaurantData)
    }
  }

  async updateEnhancedRestaurant(id: string, restaurantData: Partial<RestaurantFormData>): Promise<AdminRestaurant | null> {
    try {
      const updateData: any = {};
      
      // Only update fields that are provided
      if (restaurantData.name) updateData.name = restaurantData.name;
      if (restaurantData.description) updateData.description = restaurantData.description;
      if (restaurantData.location) updateData.location = restaurantData.location;
      if (restaurantData.opening_hours) updateData.opening_hours = restaurantData.opening_hours;
      if (restaurantData.cuisine_type) updateData.cuisine_type = restaurantData.cuisine_type;
      if (restaurantData.price_range) updateData.price_range = restaurantData.price_range;
      if (restaurantData.capacity !== undefined) updateData.capacity = restaurantData.capacity;
      if (restaurantData.features) updateData.features = restaurantData.features;
      if (restaurantData.status) updateData.status = restaurantData.status;
      if (restaurantData.image_urls || restaurantData.images) {
        updateData.image_urls = restaurantData.image_urls || restaurantData.images;
      }
      if (restaurantData.is_featured !== undefined) updateData.is_featured = restaurantData.is_featured;
      if (restaurantData.dietary_options) updateData.dietary_options = restaurantData.dietary_options;
      if (restaurantData.mealtimes) updateData.mealtimes = restaurantData.mealtimes;
      if (restaurantData.website) updateData.website = restaurantData.website;
      if (restaurantData.phone) updateData.phone = restaurantData.phone;
      if (restaurantData.social_media) updateData.social_media = restaurantData.social_media;

      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error(`Error updating enhanced restaurant with id ${id}:`, error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error(`Error in updateEnhancedRestaurant for id ${id}:`, error)
      // Fallback to regular update if enhanced update fails
      return this.updateRestaurant(id, restaurantData)
    }
  }

  async getFeaturedRestaurants(): Promise<AdminRestaurant[]> {
    try {
      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching featured restaurants:', error)
        throw error
      }
      
      return data || []
    } catch (error) {
      console.error('Error in getFeaturedRestaurants:', error)
      return []
    }
  }

  async getRandomRestaurants(limit: number = 3): Promise<AdminRestaurant[]> {
    try {
      // Get random restaurants using a more complex query
      const { data, error } = await this.supabase
        .from('admin_restaurants')
        .select('*')
        .eq('status', 'active')
        .order('id', { ascending: false })
        .limit(limit)
      
      if (error) {
        console.error('Error fetching random restaurants:', error)
        throw error
      }
      
      return data
    } catch (error) {
      console.error('Error in getRandomRestaurants:', error)
      return []
    }
  }

  async runEnhancedSetupScripts(): Promise<{success: boolean, message: string, created: string[]}> {
    try {
      // First run the basic setup
      const basicSetup = await this.runSetupScripts();
      
      if (!basicSetup.success) {
        return basicSetup;
      }
      
      // Execute the enhanced restaurant schema using an RPC call
      // This assumes you've created a server-side function that applies the enhanced schema
      const { data, error } = await this.supabase.rpc('apply_enhanced_restaurant_schema')
      
      if (error) {
        console.error('Error executing enhanced schema:', error)
        return basicSetup
      }
      
      return {
        success: true,
        message: 'Successfully set up enhanced restaurant database tables',
        created: [
          ...basicSetup.created,
          'admin_restaurant_reviews',
          'admin_restaurant_offers'
        ]
      }
    } catch (error: any) {
      console.error('Error in runEnhancedSetupScripts:', error)
      return {
        success: false,
        message: `Error running enhanced setup scripts: ${error.message}`,
        created: []
      }
    }
  }
} 
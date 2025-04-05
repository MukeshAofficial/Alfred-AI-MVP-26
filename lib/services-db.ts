import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// Define service types
export type ServiceCategory = 
  | 'restaurant' 
  | 'spa' 
  | 'tour' 
  | 'transport' 
  | 'entertainment' 
  | 'other';

export interface ServiceData {
  id?: string;
  vendor_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: ServiceCategory;
  duration?: number; // in minutes
  availability?: string[];
  images?: string[];
  location?: string;
  created_at?: string;
  business_name?: string;
}

export interface ServiceFilter {
  category?: ServiceCategory;
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
}

// Services database service
export class ServicesDB {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Get services with optional filtering
  async getServices(filters?: ServiceFilter) {
    let query = this.supabase
      .from('services')
      .select(`
        *,
        vendors(business_name)
      `);

    // Apply filters if provided
    if (filters) {
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }
      
      if (filters.searchQuery) {
        query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching services:", error);
      throw error;
    }

    // Transform the data to include business_name
    return data.map(service => ({
      ...service,
      business_name: service.vendors?.business_name
    })) as ServiceData[];
  }

  // Get services for a specific vendor
  async getVendorServices(vendorId: string) {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('vendor_id', vendorId);

    if (error) {
      console.error("Error fetching vendor services:", error);
      throw error;
    }

    return data as ServiceData[];
  }

  // Get a single service by ID
  async getServiceById(serviceId: string) {
    const { data, error } = await this.supabase
      .from('services')
      .select(`
        *,
        vendors(business_name)
      `)
      .eq('id', serviceId)
      .single();

    if (error) {
      console.error("Error fetching service by ID:", error);
      throw error;
    }

    return {
      ...data,
      business_name: data.vendors?.business_name
    } as ServiceData;
  }

  // Create a new service
  async createService(serviceData: Omit<ServiceData, 'id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('services')
      .insert([serviceData])
      .select();

    if (error) {
      console.error("Error creating service:", error);
      throw error;
    }

    return data[0] as ServiceData;
  }

  // Update an existing service
  async updateService(serviceId: string, serviceData: Partial<ServiceData>) {
    const { data, error } = await this.supabase
      .from('services')
      .update(serviceData)
      .eq('id', serviceId)
      .select();

    if (error) {
      console.error("Error updating service:", error);
      throw error;
    }

    return data[0] as ServiceData;
  }

  // Delete a service
  async deleteService(serviceId: string) {
    const { error } = await this.supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error("Error deleting service:", error);
      throw error;
    }

    return true;
  }
} 
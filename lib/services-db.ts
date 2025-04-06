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

// Global cache to persist between page navigations
const GLOBAL_CACHE = {
  vendorServices: new Map<string, { data: ServiceData[], timestamp: number }>(),
  serviceDetails: new Map<string, { data: ServiceData, timestamp: number }>()
};

// Services database service
export class ServicesDB {
  private supabase;
  private cacheDuration = 60000; // 60 seconds cache

  constructor() {
    this.supabase = createClientComponentClient();
  }

  // Get services with optional filtering - simplified to avoid expensive joins
  async getServices(filters?: ServiceFilter) {
    let query = this.supabase.from('services').select('*');

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

    try {
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ServiceData[];
    } catch (error) {
      console.error("Error fetching services:", error);
      return []; // Return empty array instead of throwing - more robust for UI
    }
  }

  // Get services for a specific vendor - optimized with memory and localStorage caching
  async getVendorServices(vendorId: string, forceRefresh = false) {
    // Check global memory cache first (persists between page navigations)
    if (!forceRefresh) {
      const cachedData = GLOBAL_CACHE.vendorServices.get(vendorId);
      if (cachedData && (Date.now() - cachedData.timestamp < this.cacheDuration)) {
        console.log("Using global cached vendor services data");
        return cachedData.data;
      }
      
      // Try localStorage as fallback for refreshes
      try {
        const localStorageKey = `vendor_services_${vendorId}`;
        const storedData = localStorage.getItem(localStorageKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (Date.now() - parsedData.timestamp < this.cacheDuration) {
            console.log("Using localStorage cached vendor services");
            GLOBAL_CACHE.vendorServices.set(vendorId, {
              data: parsedData.data,
              timestamp: parsedData.timestamp
            });
            return parsedData.data;
          }
        }
      } catch (e) {
        console.warn("localStorage error:", e);
      }
    }

    try {
      // Use a simpler query with fewer columns for better performance
      const { data, error } = await this.supabase
        .from('services')
        .select('id, name, description, price, currency, category, images, location')
        .eq('vendor_id', vendorId);

      if (error) throw error;

      // Update all caches
      GLOBAL_CACHE.vendorServices.set(vendorId, {
        data: data as ServiceData[],
        timestamp: Date.now()
      });
      
      try {
        localStorage.setItem(`vendor_services_${vendorId}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn("localStorage error:", e);
      }

      return data as ServiceData[];
    } catch (error) {
      console.error("Error fetching vendor services:", error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get a single service by ID - with more aggressive caching
  async getServiceById(serviceId: string, forceRefresh = false) {
    // Check global cache first
    if (!forceRefresh) {
      const cachedData = GLOBAL_CACHE.serviceDetails.get(serviceId);
      if (cachedData && (Date.now() - cachedData.timestamp < this.cacheDuration)) {
        console.log("Using cached service data");
        return cachedData.data;
      }
      
      // Try localStorage
      try {
        const localStorageKey = `service_${serviceId}`;
        const storedData = localStorage.getItem(localStorageKey);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (Date.now() - parsedData.timestamp < this.cacheDuration) {
            console.log("Using localStorage cached service");
            GLOBAL_CACHE.serviceDetails.set(serviceId, {
              data: parsedData.data,
              timestamp: parsedData.timestamp
            });
            return parsedData.data;
          }
        }
      } catch (e) {
        console.warn("localStorage error:", e);
      }
    }

    try {
      // Simpler query avoiding the join initially
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();

      if (error) throw error;
      
      const serviceData = data as ServiceData;
      
      // Update caches
      GLOBAL_CACHE.serviceDetails.set(serviceId, {
        data: serviceData,
        timestamp: Date.now()
      });
      
      try {
        localStorage.setItem(`service_${serviceId}`, JSON.stringify({
          data: serviceData,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn("localStorage error:", e);
      }

      return serviceData;
    } catch (error) {
      console.error("Error fetching service by ID:", error);
      throw error;
    }
  }

  // Create a new service - simplified with better error handling
  async createService(serviceData: Omit<ServiceData, 'id' | 'created_at'>) {
    try {
      const { data, error } = await this.supabase
        .from('services')
        .insert([serviceData])
        .select('id, name, description, price, currency, category, vendor_id')
        .single();

      if (error) throw error;
      
      // Clear vendor services cache
      this.clearVendorCache(serviceData.vendor_id);
      
      return data as ServiceData;
    } catch (error) {
      console.error("Error creating service:", error);
      throw error;
    }
  }

  // Update an existing service - with optimistic updates
  async updateService(serviceId: string, serviceData: Partial<ServiceData>) {
    try {
      // Pre-cache the current service to know its vendor_id
      const existingService = await this.getServiceById(serviceId);
      
      const { data, error } = await this.supabase
        .from('services')
        .update(serviceData)
        .eq('id', serviceId)
        .select('id, name, description, price, currency, category, vendor_id')
        .single();

      if (error) throw error;
      
      // Clear specific caches
      GLOBAL_CACHE.serviceDetails.delete(serviceId);
      if (existingService.vendor_id) {
        this.clearVendorCache(existingService.vendor_id);
      }
      
      try {
        localStorage.removeItem(`service_${serviceId}`);
      } catch (e) {
        console.warn("localStorage error:", e);
      }
      
      return data as ServiceData;
    } catch (error) {
      console.error("Error updating service:", error);
      throw error;
    }
  }

  // Delete a service
  async deleteService(serviceId: string) {
    try {
      // Get service first to know vendor_id
      const service = await this.getServiceById(serviceId);
      
      const { error } = await this.supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      // Clear caches
      GLOBAL_CACHE.serviceDetails.delete(serviceId);
      if (service.vendor_id) {
        this.clearVendorCache(service.vendor_id);
      }
      
      try {
        localStorage.removeItem(`service_${serviceId}`);
      } catch (e) {
        console.warn("localStorage error:", e);
      }

      return true;
    } catch (error) {
      console.error("Error deleting service:", error);
      throw error;
    }
  }
  
  // Clear vendor cache helper
  private clearVendorCache(vendorId: string) {
    GLOBAL_CACHE.vendorServices.delete(vendorId);
    try {
      localStorage.removeItem(`vendor_services_${vendorId}`);
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  }
} 
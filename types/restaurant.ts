export interface AdminRestaurant {
  id: string;
  name: string;
  description: string;
  location: string;
  images?: string[];
  image_urls?: string[];
  opening_hours: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  cuisine_type: string;
  price_range: string;
  capacity?: number;
  features?: string[];
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  menu_count?: number;
  table_count?: number;
  booking_count?: number;
  
  is_featured?: boolean;
  average_rating?: number;
  popularity_score?: number;
  dietary_options?: string[];
  mealtimes?: {
    breakfast?: { start: string; end: string };
    lunch?: { start: string; end: string };
    dinner?: { start: string; end: string };
    brunch?: { start: string; end: string };
  };
  website?: string;
  phone?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tripadvisor?: string;
  };
}

export interface AdminRestaurantMenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  dietary_info?: string[];
  images?: string[];
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  restaurant?: AdminRestaurant;
}

export interface AdminRestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: string;
  seats: number;
  location?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  restaurant?: AdminRestaurant;
}

export interface AdminRestaurantBooking {
  id: string;
  restaurant_id: string;
  table_id?: string;
  guest_id: string;
  booking_date: string;
  party_size: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
  payment_intent?: string;
  amount_paid?: number;
  currency?: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
  restaurant?: AdminRestaurant;
  table?: AdminRestaurantTable;
}

export interface RestaurantFormData {
  name: string;
  description: string;
  location: string;
  cuisine_type: string;
  price_range: string;
  status: string;
  opening_hours: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  capacity?: number;
  features?: string[];
  images?: string[];
  image_urls?: string[];
  
  is_featured?: boolean;
  dietary_options?: string[];
  mealtimes?: {
    breakfast?: { start: string; end: string };
    lunch?: { start: string; end: string };
    dinner?: { start: string; end: string };
    brunch?: { start: string; end: string };
  };
  website?: string;
  phone?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tripadvisor?: string;
  };
}

export interface RestaurantMenuItemFormData {
  name: string;
  description: string;
  restaurant_id: string;
  price: number;
  currency: string;
  category: string;
  dietary_info?: string[];
  is_available: boolean;
  is_featured: boolean;
  images?: string[];
}

export interface RestaurantTableFormData {
  restaurant_id: string;
  table_number: string;
  seats: number;
  location?: string;
  is_available: boolean;
}

export interface RestaurantBookingFormData {
  restaurant_id: string;
  table_id?: string;
  guest_id: string;
  booking_date: string;
  party_size: number;
  status: string;
  payment_status: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;
}

export interface AdminRestaurantReview {
  id: string;
  restaurant_id: string;
  reviewer_id: string;
  rating: number;
  review_text?: string;
  review_date: string;
  is_verified: boolean;
  is_published: boolean;
  reply?: string;
  reply_date?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface AdminRestaurantOffer {
  id: string;
  restaurant_id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  promo_code?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
} 
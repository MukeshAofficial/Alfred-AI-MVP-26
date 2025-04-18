export interface AdminSpa {
  id: string;
  name: string;
  description: string;
  location: string;
  images?: string[];
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
  amenities?: string[];
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
  service_count?: number; // Optional field to store the count of services for this spa
  booking_count?: number; // Optional field to store the count of bookings for this spa
}

export interface AdminSpaService {
  id: string;
  spa_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration?: number; // in minutes
  images?: string[];
  status: 'available' | 'unavailable' | 'featured';
  therapists?: string[];
  special_requirements?: string;
  created_at: string;
  updated_at: string;
  spa?: AdminSpa; // Optional reference to the parent spa
  booking_count?: number; // Optional field to store the count of bookings for this service
}

export interface AdminSpaBooking {
  id: string;
  spa_id: string;
  service_id: string;
  guest_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  payment_status: 'unpaid' | 'paid' | 'refunded' | 'failed';
  payment_intent?: string;
  amount_paid?: number;
  currency?: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;
  therapist_assigned?: string;
  created_at: string;
  updated_at: string;
  service?: AdminSpaService; // Optional reference to the service
  spa?: AdminSpa; // Optional reference to the spa
}

export interface SpaFormData {
  name: string;
  description: string;
  location: string;
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
  amenities?: string[];
  images?: string[];
}

export interface SpaServiceFormData {
  name: string;
  description: string;
  spa_id: string;
  price: number;
  currency: string;
  duration?: number;
  status: string;
  therapists?: string[];
  special_requirements?: string;
  images?: string[];
  category?: string;
}

export interface SpaBookingFormData {
  spa_id: string;
  service_id: string;
  guest_id: string;
  booking_date: string;
  status: string;
  payment_status: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  special_requests?: string;
  therapist_assigned?: string;
} 
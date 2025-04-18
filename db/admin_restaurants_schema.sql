-- Admin Restaurants Table
CREATE TABLE public.admin_restaurants (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  images TEXT[] NULL,
  opening_hours JSONB NOT NULL,
  cuisine_type TEXT NOT NULL,
  price_range TEXT NOT NULL,
  capacity INTEGER NULL,
  features TEXT[] NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_restaurants_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurants_status_check CHECK (
    (
      status = ANY (
        ARRAY['active'::TEXT, 'inactive'::TEXT, 'maintenance'::TEXT]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_restaurants_status_idx ON public.admin_restaurants USING btree (status) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_restaurants_updated_at
BEFORE UPDATE ON admin_restaurants
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Admin Restaurant Menu Items Table
CREATE TABLE public.admin_restaurant_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD'::TEXT,
  category TEXT NOT NULL,
  dietary_info TEXT[] NULL,
  images TEXT[] NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_restaurant_menu_items_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurant_menu_items_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES admin_restaurants (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_menu_items_price_check CHECK (price >= 0)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_restaurant_menu_items_restaurant_id_idx ON public.admin_restaurant_menu_items USING btree (restaurant_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_menu_items_category_idx ON public.admin_restaurant_menu_items USING btree (category) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_restaurant_menu_items_updated_at
BEFORE UPDATE ON admin_restaurant_menu_items
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Admin Restaurant Tables Table
CREATE TABLE public.admin_restaurant_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  table_number TEXT NOT NULL,
  seats INTEGER NOT NULL,
  location TEXT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_restaurant_tables_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurant_tables_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES admin_restaurants (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_tables_seats_check CHECK (seats > 0)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_restaurant_tables_restaurant_id_idx ON public.admin_restaurant_tables USING btree (restaurant_id) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_restaurant_tables_updated_at
BEFORE UPDATE ON admin_restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Admin Restaurant Bookings Table
CREATE TABLE public.admin_restaurant_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  table_id UUID NULL,
  guest_id UUID NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  party_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_intent TEXT NULL,
  amount_paid NUMERIC NULL,
  currency TEXT NULL DEFAULT 'USD'::TEXT,
  guest_name TEXT NOT NULL,
  guest_email TEXT NULL,
  guest_phone TEXT NULL,
  special_requests TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_restaurant_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurant_bookings_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES admin_restaurants (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_bookings_table_id_fkey FOREIGN KEY (table_id) REFERENCES admin_restaurant_tables (id) ON DELETE SET NULL,
  CONSTRAINT admin_restaurant_bookings_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_bookings_status_check CHECK (
    (
      status = ANY (
        ARRAY['pending'::TEXT, 'confirmed'::TEXT, 'completed'::TEXT, 'cancelled'::TEXT, 'rescheduled'::TEXT]
      )
    )
  ),
  CONSTRAINT admin_restaurant_bookings_payment_status_check CHECK (
    (
      payment_status = ANY (
        ARRAY['unpaid'::TEXT, 'paid'::TEXT, 'refunded'::TEXT, 'failed'::TEXT]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_restaurant_id_idx ON public.admin_restaurant_bookings USING btree (restaurant_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_table_id_idx ON public.admin_restaurant_bookings USING btree (table_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_guest_id_idx ON public.admin_restaurant_bookings USING btree (guest_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_status_idx ON public.admin_restaurant_bookings USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_payment_status_idx ON public.admin_restaurant_bookings USING btree (payment_status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_restaurant_bookings_booking_date_idx ON public.admin_restaurant_bookings USING btree (booking_date) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_restaurant_bookings_updated_at
BEFORE UPDATE ON admin_restaurant_bookings
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at(); 
-- Admin Spa Bookings Table
CREATE TABLE public.admin_spa_bookings (
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
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_spa_bookings_spa_id_idx ON public.admin_spa_bookings USING btree (spa_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_bookings_service_id_idx ON public.admin_spa_bookings USING btree (service_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_bookings_guest_id_idx ON public.admin_spa_bookings USING btree (guest_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_bookings_status_idx ON public.admin_spa_bookings USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_bookings_payment_status_idx ON public.admin_spa_bookings USING btree (payment_status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_bookings_booking_date_idx ON public.admin_spa_bookings USING btree (booking_date) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_spa_bookings_updated_at
BEFORE UPDATE ON admin_spa_bookings
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_timestamp
BEFORE UPDATE ON admin_spa_bookings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 
-- Create bookings table for service bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL,
  user_id UUID NOT NULL,
  vendor_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_intent TEXT,
  amount_paid NUMERIC,
  currency TEXT DEFAULT 'USD',
  booking_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT bookings_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT bookings_status_check CHECK (
    status = ANY (ARRAY['pending', 'confirmed', 'completed', 'canceled', 'rescheduled'])
  ),
  CONSTRAINT bookings_payment_status_check CHECK (
    payment_status = ANY (ARRAY['unpaid', 'paid', 'refunded', 'failed'])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS bookings_service_id_idx ON public.bookings USING btree (service_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON public.bookings USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS bookings_vendor_id_idx ON public.bookings USING btree (vendor_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings USING btree (status) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON public.bookings USING btree (payment_status) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create the trigger if it doesn't exist already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bookings_updated_at'
  ) THEN
    CREATE TRIGGER bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$; 
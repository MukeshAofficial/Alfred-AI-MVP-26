-- Admin Spas Table
CREATE TABLE public.admin_spas (
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
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_spas_status_idx ON public.admin_spas USING btree (status) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_spas_updated_at
BEFORE UPDATE ON admin_spas
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_timestamp
BEFORE UPDATE ON admin_spas
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Admin Spa Services Table
CREATE TABLE public.admin_spa_services (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  spa_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD'::TEXT,
  duration INTEGER NULL, -- in minutes
  images TEXT[] NULL,
  status TEXT NOT NULL DEFAULT 'available'::TEXT,
  therapists TEXT[] NULL, -- List of therapists who can perform this service
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
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_spa_services_spa_id_idx ON public.admin_spa_services USING btree (spa_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS admin_spa_services_status_idx ON public.admin_spa_services USING btree (status) TABLESPACE pg_default;

-- Add triggers for updating timestamps
CREATE TRIGGER admin_spa_services_updated_at
BEFORE UPDATE ON admin_spa_services
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_timestamp
BEFORE UPDATE ON admin_spa_services
FOR EACH ROW
EXECUTE FUNCTION update_timestamp(); 
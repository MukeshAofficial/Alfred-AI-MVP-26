-- Enhanced Restaurant Schema with more features

-- Add image_urls column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN image_urls TEXT[] NULL;
  END IF;
END $$;

-- Add featured column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add rating column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN average_rating NUMERIC(3, 2) NULL;
  END IF;
END $$;

-- Add dietary_options column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'dietary_options'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN dietary_options TEXT[] NULL;
  END IF;
END $$;

-- Add mealtimes column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'mealtimes'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN mealtimes JSONB NULL;
  END IF;
END $$;

-- Add website and phone columns to admin_restaurants if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'website'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN website TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN phone TEXT NULL;
  END IF;
END $$;

-- Add social_media column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'social_media'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN social_media JSONB NULL;
  END IF;
END $$;

-- Restaurant Reviews Table
CREATE TABLE IF NOT EXISTS public.admin_restaurant_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL,
  review_text TEXT NULL,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  reply TEXT NULL,
  reply_date TIMESTAMP WITH TIME ZONE NULL,
  CONSTRAINT admin_restaurant_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurant_reviews_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES admin_restaurants (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT admin_restaurant_reviews_rating_check CHECK (rating BETWEEN 1 AND 5)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS admin_restaurant_reviews_restaurant_id_idx ON public.admin_restaurant_reviews USING btree (restaurant_id);
CREATE INDEX IF NOT EXISTS admin_restaurant_reviews_reviewer_id_idx ON public.admin_restaurant_reviews USING btree (reviewer_id);
CREATE INDEX IF NOT EXISTS admin_restaurant_reviews_rating_idx ON public.admin_restaurant_reviews USING btree (rating);

-- Restaurant Special Offers Table
CREATE TABLE IF NOT EXISTS public.admin_restaurant_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_percentage INTEGER NULL,
  discount_amount NUMERIC NULL,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  promo_code TEXT NULL,
  image_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT admin_restaurant_offers_pkey PRIMARY KEY (id),
  CONSTRAINT admin_restaurant_offers_restaurant_id_fkey FOREIGN KEY (restaurant_id) REFERENCES admin_restaurants (id) ON DELETE CASCADE
);

-- Create indexes for offers
CREATE INDEX IF NOT EXISTS admin_restaurant_offers_restaurant_id_idx ON public.admin_restaurant_offers USING btree (restaurant_id);
CREATE INDEX IF NOT EXISTS admin_restaurant_offers_is_active_idx ON public.admin_restaurant_offers USING btree (is_active);

-- Add triggers for updating timestamps
CREATE TRIGGER admin_restaurant_offers_updated_at
BEFORE UPDATE ON admin_restaurant_offers
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Function to calculate average rating for a restaurant
CREATE OR REPLACE FUNCTION update_restaurant_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new average rating when reviews are added, updated or deleted
  UPDATE admin_restaurants
  SET average_rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM admin_restaurant_reviews
    WHERE restaurant_id = NEW.restaurant_id
    AND is_published = true
  )
  WHERE id = NEW.restaurant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating average rating
DROP TRIGGER IF EXISTS update_restaurant_rating ON admin_restaurant_reviews;
CREATE TRIGGER update_restaurant_rating
AFTER INSERT OR UPDATE OR DELETE ON admin_restaurant_reviews
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_average_rating();

-- Add popularity_score column to admin_restaurants if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurants'
    AND column_name = 'popularity_score'
  ) THEN
    ALTER TABLE admin_restaurants
    ADD COLUMN popularity_score INTEGER NULL DEFAULT 0;
  END IF;
END $$;

-- Function to handle enhanced restaurant data
CREATE OR REPLACE FUNCTION create_enhanced_restaurant(
  name TEXT,
  description TEXT,
  location TEXT,
  cuisine_type TEXT,
  price_range TEXT,
  image_urls TEXT[],
  opening_hours JSONB,
  capacity INTEGER,
  features TEXT[],
  is_featured BOOLEAN,
  website TEXT,
  phone TEXT,
  social_media JSONB,
  dietary_options TEXT[]
)
RETURNS UUID AS $$
DECLARE
  new_restaurant_id UUID;
BEGIN
  INSERT INTO admin_restaurants (
    name, description, location, cuisine_type, price_range, 
    image_urls, opening_hours, capacity, features, 
    is_featured, website, phone, social_media, dietary_options,
    status
  ) VALUES (
    name, description, location, cuisine_type, price_range,
    image_urls, opening_hours, capacity, features,
    is_featured, website, phone, social_media, dietary_options,
    'active'
  ) RETURNING id INTO new_restaurant_id;
  
  RETURN new_restaurant_id;
END;
$$ LANGUAGE plpgsql; 
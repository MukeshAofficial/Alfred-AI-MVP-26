-- Add dietary_info column to admin_restaurant_menu_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'admin_restaurant_menu_items'
    AND column_name = 'dietary_info'
  ) THEN
    ALTER TABLE admin_restaurant_menu_items
    ADD COLUMN dietary_info TEXT[] NULL;
  END IF;
END $$;

-- Function to create some sample menu items for a restaurant
CREATE OR REPLACE FUNCTION create_sample_menu_items(restaurant_id UUID)
RETURNS VOID AS $$
DECLARE
  starters_exist BOOLEAN;
  mains_exist BOOLEAN;
  desserts_exist BOOLEAN;
  drinks_exist BOOLEAN;
BEGIN
  -- Check if menu items already exist for this restaurant (one SELECT per check)
  SELECT EXISTS(
    SELECT 1 FROM admin_restaurant_menu_items 
    WHERE restaurant_id = create_sample_menu_items.restaurant_id 
    AND category = 'starters'
  ) INTO starters_exist;
  
  SELECT EXISTS(
    SELECT 1 FROM admin_restaurant_menu_items 
    WHERE restaurant_id = create_sample_menu_items.restaurant_id 
    AND category = 'mains'
  ) INTO mains_exist;
  
  SELECT EXISTS(
    SELECT 1 FROM admin_restaurant_menu_items 
    WHERE restaurant_id = create_sample_menu_items.restaurant_id 
    AND category = 'desserts'
  ) INTO desserts_exist;
  
  SELECT EXISTS(
    SELECT 1 FROM admin_restaurant_menu_items 
    WHERE restaurant_id = create_sample_menu_items.restaurant_id 
    AND category = 'drinks'
  ) INTO drinks_exist;
  
  -- Only add sample items if none exist in that category
  IF NOT starters_exist THEN
    INSERT INTO admin_restaurant_menu_items (
      restaurant_id, name, description, price, currency, category, dietary_info, is_available, is_featured
    ) VALUES 
      (restaurant_id, 'Garlic Bread', 'Freshly baked bread with garlic butter', 5.99, 'USD', 'starters', ARRAY['Vegetarian'], true, false),
      (restaurant_id, 'Calamari', 'Crispy fried squid with lemon aioli', 9.99, 'USD', 'starters', NULL, true, true),
      (restaurant_id, 'Bruschetta', 'Toasted bread topped with tomatoes, garlic, and basil', 7.99, 'USD', 'starters', ARRAY['Vegetarian', 'Vegan'], true, false);
  END IF;
  
  IF NOT mains_exist THEN
    INSERT INTO admin_restaurant_menu_items (
      restaurant_id, name, description, price, currency, category, dietary_info, is_available, is_featured
    ) VALUES 
      (restaurant_id, 'Classic Burger', 'Beef patty with lettuce, tomato, and special sauce', 14.99, 'USD', 'mains', NULL, true, true),
      (restaurant_id, 'Grilled Salmon', 'Fresh salmon with asparagus and lemon butter sauce', 18.99, 'USD', 'mains', ARRAY['Gluten-Free'], true, false),
      (restaurant_id, 'Veggie Pasta', 'Penne with seasonal vegetables and tomato sauce', 12.99, 'USD', 'mains', ARRAY['Vegetarian', 'Vegan'], true, false);
  END IF;
  
  IF NOT desserts_exist THEN
    INSERT INTO admin_restaurant_menu_items (
      restaurant_id, name, description, price, currency, category, dietary_info, is_available, is_featured
    ) VALUES 
      (restaurant_id, 'Chocolate Fondant', 'Warm chocolate cake with melting center and vanilla ice cream', 8.99, 'USD', 'desserts', ARRAY['Vegetarian'], true, true),
      (restaurant_id, 'Cheesecake', 'New York style cheesecake with berry compote', 7.99, 'USD', 'desserts', ARRAY['Vegetarian'], true, false),
      (restaurant_id, 'Fruit Sorbet', 'Refreshing fruit sorbet selection', 5.99, 'USD', 'desserts', ARRAY['Vegetarian', 'Vegan', 'Gluten-Free'], true, false);
  END IF;
  
  IF NOT drinks_exist THEN
    INSERT INTO admin_restaurant_menu_items (
      restaurant_id, name, description, price, currency, category, dietary_info, is_available, is_featured
    ) VALUES 
      (restaurant_id, 'House Wine', 'Red or white wine selection by glass', 7.99, 'USD', 'drinks', ARRAY['Vegan', 'Gluten-Free'], true, false),
      (restaurant_id, 'Craft Beer', 'Selection of local craft beers', 6.99, 'USD', 'drinks', NULL, true, false),
      (restaurant_id, 'Fresh Juice', 'Seasonal fruit juice, freshly squeezed', 4.99, 'USD', 'drinks', ARRAY['Vegetarian', 'Vegan', 'Gluten-Free'], true, true);
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Add a sample data function that can be called from the application
CREATE OR REPLACE FUNCTION initialize_restaurant_with_menu(restaurant_name TEXT, restaurant_description TEXT, cuisine_type TEXT, price_range TEXT)
RETURNS UUID AS $$
DECLARE
  restaurant_exists BOOLEAN;
  new_restaurant_id UUID;
BEGIN
  -- Check if restaurant already exists
  SELECT EXISTS(
    SELECT 1 FROM admin_restaurants WHERE name = restaurant_name
  ) INTO restaurant_exists;
  
  -- Only create if it doesn't exist
  IF NOT restaurant_exists THEN
    INSERT INTO admin_restaurants (
      name, description, location, opening_hours, cuisine_type, price_range, capacity, status
    ) VALUES (
      restaurant_name,
      restaurant_description,
      '123 Main Street, City Center',
      '{"monday":{"start":"09:00","end":"22:00"},"tuesday":{"start":"09:00","end":"22:00"},"wednesday":{"start":"09:00","end":"22:00"},"thursday":{"start":"09:00","end":"22:00"},"friday":{"start":"09:00","end":"23:00"},"saturday":{"start":"10:00","end":"23:00"},"sunday":{"start":"10:00","end":"22:00"}}'::jsonb,
      cuisine_type,
      price_range,
      50,
      'active'
    ) RETURNING id INTO new_restaurant_id;
    
    -- Create sample menu items for this restaurant
    PERFORM create_sample_menu_items(new_restaurant_id);
    
    RETURN new_restaurant_id;
  ELSE
    SELECT id INTO new_restaurant_id FROM admin_restaurants WHERE name = restaurant_name LIMIT 1;
    RETURN new_restaurant_id;
  END IF;
END;
$$ LANGUAGE plpgsql; 
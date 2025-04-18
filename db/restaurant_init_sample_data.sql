-- Function to execute from TypeScript to create a sample restaurant with menu items
CREATE OR REPLACE FUNCTION rpc_initialize_sample_restaurant()
RETURNS JSONB AS $$
DECLARE
  restaurant_id UUID;
  menu_count INTEGER;
BEGIN
  -- Call the initialize_restaurant_with_menu function
  restaurant_id := initialize_restaurant_with_menu(
    'Sample Restaurant', 
    'A sample restaurant with auto-generated menu items',
    'International',
    '$$'
  );
  
  -- Count how many menu items were created
  SELECT COUNT(*) INTO menu_count 
  FROM admin_restaurant_menu_items 
  WHERE restaurant_id = restaurant_id;
  
  -- Return a JSON result with information about what was created
  RETURN jsonb_build_object(
    'success', true,
    'restaurant_id', restaurant_id,
    'menu_items_count', menu_count,
    'message', 'Sample restaurant and menu items created successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to create sample restaurant and menu items'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- Function to fetch spa bookings by email (fallback for UUID issues)
CREATE OR REPLACE FUNCTION get_spa_bookings_by_email(user_email TEXT)
RETURNS SETOF admin_spa_bookings AS $$
BEGIN
  -- First try to match by email in the admin_spa_bookings table
  RETURN QUERY 
    SELECT * FROM admin_spa_bookings
    WHERE guest_email = user_email
    ORDER BY created_at DESC;
    
  -- If no results, try to get the UUID from profiles and match by guest_id
  IF NOT FOUND THEN
    RETURN QUERY 
      SELECT asb.* FROM admin_spa_bookings asb
      JOIN profiles p ON p.id = asb.guest_id
      WHERE p.email = user_email
      ORDER BY asb.created_at DESC;
  END IF;
  
  -- If still no results, return empty set (handled automatically)
END;
$$ LANGUAGE plpgsql; 
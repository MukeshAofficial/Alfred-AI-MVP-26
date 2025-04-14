-- Function to bypass foreign key constraints for admin_spa_bookings
CREATE OR REPLACE FUNCTION create_booking_bypass_fk(booking_data JSONB)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
  guest_id_exists BOOLEAN;
BEGIN
  -- Check if the guest_id exists in profiles
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE id = (booking_data->>'guest_id')::UUID
  ) INTO guest_id_exists;
  
  -- If guest_id doesn't exist in profiles, create a guest profile
  IF NOT guest_id_exists THEN
    -- First check if 'guest' profile exists
    SELECT EXISTS(
      SELECT 1 FROM profiles
      WHERE id = 'guest'
    ) INTO guest_id_exists;
    
    -- Create a guest profile if needed
    IF NOT guest_id_exists THEN
      INSERT INTO profiles (
        id, username, full_name, email, role, created_at, updated_at
      ) VALUES (
        'guest', 'guest', 'Guest User', 'guest@example.com', 'user', NOW(), NOW()
      );
    END IF;
    
    -- Set booking to use the guest profile
    booking_data = jsonb_set(booking_data, '{guest_id}', '"guest"');
  END IF;
  
  -- Insert the booking with the modified data
  INSERT INTO admin_spa_bookings (
    id, spa_id, service_id, guest_id, 
    booking_date, status, payment_status, 
    payment_intent, amount_paid, currency, 
    guest_name, guest_email, guest_phone, 
    special_requests, therapist_assigned, 
    created_at, updated_at
  )
  VALUES (
    gen_random_uuid(),
    (booking_data->>'spa_id')::UUID, 
    (booking_data->>'service_id')::UUID,
    (booking_data->>'guest_id')::UUID,
    (booking_data->>'booking_date')::TIMESTAMP WITH TIME ZONE,
    COALESCE(booking_data->>'status', 'confirmed'),
    COALESCE(booking_data->>'payment_status', 'paid'),
    booking_data->>'payment_intent',
    (booking_data->>'amount_paid')::NUMERIC,
    COALESCE(booking_data->>'currency', 'USD'),
    COALESCE(booking_data->>'guest_name', 'Guest'),
    booking_data->>'guest_email',
    booking_data->>'guest_phone',
    booking_data->>'special_requests',
    booking_data->>'therapist_assigned',
    COALESCE((booking_data->>'created_at')::TIMESTAMP WITH TIME ZONE, NOW()),
    COALESCE((booking_data->>'updated_at')::TIMESTAMP WITH TIME ZONE, NOW())
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
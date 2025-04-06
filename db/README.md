# Database Setup Guide

This folder contains SQL files for setting up the database tables and triggers needed for the application.

## Bookings Table

The `bookings-table.sql` file contains the SQL commands to create the bookings table with all necessary constraints, indexes, and triggers.

### How to Run

You can run this SQL in several ways:

1. **Using Supabase Dashboard:**
   - Go to your Supabase project
   - Navigate to the SQL Editor
   - Paste the contents of `bookings-table.sql` 
   - Run the query

2. **Using psql CLI:**
   ```
   psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f bookings-table.sql
   ```

3. **Using Supabase CLI:**
   ```
   supabase db execute < bookings-table.sql
   ```

## What This SQL Does

The bookings table SQL creates:

1. A `bookings` table with all necessary columns for tracking service bookings
2. Primary key constraint on `id`
3. Foreign key constraints to link bookings with services and profiles
4. Check constraints to ensure valid status and payment status values
5. Indexes on service_id, user_id, status, and payment_status for faster queries
6. A trigger to automatically update the `updated_at` timestamp on record updates

## Table Structure

The bookings table has the following structure:

- `id`: UUID primary key, auto-generated
- `service_id`: UUID foreign key to services table
- `user_id`: UUID foreign key to profiles table
- `status`: Text field for booking status ('pending', 'confirmed', 'completed', 'canceled', 'rescheduled')
- `payment_status`: Text field for payment status ('unpaid', 'paid', 'refunded', 'failed')
- `payment_intent`: Text field to store Stripe payment intent ID
- `amount_paid`: Numeric field for the payment amount
- `currency`: Text field for the currency code
- `booking_date`: Timestamp with timezone for the booking date
- `created_at`: Timestamp with timezone, auto-set to the creation time
- `updated_at`: Timestamp with timezone, updated automatically on changes
- `metadata`: JSONB field for additional booking information

## After Running the SQL

After creating the table, you should be able to:

1. Create new bookings via the Stripe checkout process
2. View bookings in both the user profile and vendor dashboard
3. Update booking statuses
4. Filter and search bookings 
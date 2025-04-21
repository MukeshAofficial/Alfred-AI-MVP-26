-- Migration: Add Menus and Categories tables for normalized restaurant menu structure

-- Menus table
create table if not exists admin_restaurant_menus (
    id uuid primary key default gen_random_uuid(),
    restaurant_id uuid references admin_restaurants(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Categories table
create table if not exists admin_restaurant_menu_categories (
    id uuid primary key default gen_random_uuid(),
    menu_id uuid references admin_restaurant_menus(id) on delete cascade,
    restaurant_id uuid references admin_restaurants(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Alter menu items to reference category_id instead of category string
alter table if exists admin_restaurant_menu_items
    add column if not exists category_id uuid references admin_restaurant_menu_categories(id) on delete set null;

-- Optionally, drop the old category string column if you want to fully migrate
-- alter table admin_restaurant_menu_items drop column if exists category;

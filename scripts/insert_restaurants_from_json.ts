import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase credentials are missing.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default opening hours structure
const DEFAULT_OPENING_HOURS = {
  monday: { start: "08:00", end: "22:00" },
  tuesday: { start: "08:00", end: "22:00" },
  wednesday: { start: "08:00", end: "22:00" },
  thursday: { start: "08:00", end: "22:00" },
  friday: { start: "08:00", end: "22:00" },
  saturday: { start: "08:00", end: "22:00" },
  sunday: { start: "08:00", end: "22:00" }
};

const jsonPath = path.join(__dirname, '../restaurants.json');
const raw = fs.readFileSync(jsonPath, 'utf-8');
const data = JSON.parse(raw);

function getValidOpeningHours(input: any) {
  if (!input || typeof input !== 'object') return DEFAULT_OPENING_HOURS;
  const result = { ...DEFAULT_OPENING_HOURS };
  for (const day of Object.keys(DEFAULT_OPENING_HOURS)) {
    if (
      input[day] &&
      typeof input[day] === 'object' &&
      typeof input[day].start === 'string' &&
      typeof input[day].end === 'string'
    ) {
      result[day] = {
        start: input[day].start,
        end: input[day].end
      };
    }
  }
  return result;
}

async function insertAll() {
  for (const restaurant of data.restaurants) {
    // Insert restaurant
    const { data: restData, error: restErr } = await supabase
      .from('admin_restaurants')
      .insert({
        name: restaurant.name,
        description: restaurant.description || 'No description provided',
        location: restaurant.location || 'Unknown',
        images: Array.isArray(restaurant.images) ? restaurant.images : [], // Always array
        opening_hours: JSON.stringify(getValidOpeningHours(restaurant.opening_hours)),
        cuisine_type: restaurant.cuisine_type || 'Unknown',
        price_range: restaurant.price_range || 'Unknown',
        capacity: typeof restaurant.capacity === 'number' ? restaurant.capacity : null,
        features: Array.isArray(restaurant.features) ? restaurant.features : [],
        status: 'active'
      })
      .select()
      .single();
    if (restErr) throw restErr;
    const restaurantId = restData.id;

    if (!Array.isArray(restaurant.menus)) continue;
    for (const menu of restaurant.menus) {
      // Insert menu
      const { data: menuData, error: menuErr } = await supabase
        .from('admin_restaurant_menus')
        .insert({
          name: menu.name,
          restaurant_id: restaurantId,
          description: menu.description || 'No description provided',
          type: menu.type || 'dinner' // Default to 'dinner' if not specified; valid: breakfast, lunch, dinner, special
        })
        .select()
        .single();
      if (menuErr) throw menuErr;
      const menuId = menuData.id;

      if (!Array.isArray(menu.categories)) continue;
      for (const category of menu.categories) {
        // Insert category
        const { data: catData, error: catErr } = await supabase
          .from('admin_restaurant_menu_categories')
          .insert({
            name: category.name,
            menu_id: menuId,
            description: category.description || 'No description provided'
          })
          .select()
          .single();
        if (catErr) throw catErr;
        const categoryId = catData.id;

        if (!Array.isArray(category.items)) continue;
        for (const item of category.items) {
          // Insert item
          const { error: itemErr } = await supabase
            .from('admin_restaurant_menu_items')
            .insert({
              name: item.name,
              description: item.description || 'No description provided',
              price: item.price && !isNaN(Number(item.price)) ? Number(item.price) : 0,
              currency: item.currency || 'USD',
              category: category.name || 'Uncategorized',
              dietary_info: Array.isArray(item.dietary_info) ? item.dietary_info : [],
              images: Array.isArray(item.images) ? item.images : [],
              is_available: typeof item.is_available === 'boolean' ? item.is_available : true,
              is_featured: typeof item.is_featured === 'boolean' ? item.is_featured : false,
              restaurant_id: restaurantId,
              category_id: categoryId
            });
          if (itemErr) throw itemErr;
        }
      }
    }
  }
  console.log('All data inserted successfully!');
}

insertAll().catch((e) => {
  console.error(e);
  process.exit(1);
});

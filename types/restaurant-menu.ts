// Types for Restaurant Menus and Categories
export interface AdminRestaurantMenu {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMenuFormData {
  restaurant_id: string;
  name: string;
  description?: string;
}

export interface AdminRestaurantMenuCategory {
  id: string;
  menu_id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantMenuCategoryFormData {
  menu_id: string;
  restaurant_id: string;
  name: string;
  description?: string;
}

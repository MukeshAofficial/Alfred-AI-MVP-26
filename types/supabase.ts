export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: "guest" | "admin" | "vendor"
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          phone: string | null
        }
        Insert: {
          id: string
          role: "guest" | "admin" | "vendor"
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          role?: "guest" | "admin" | "vendor"
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          phone?: string | null
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}


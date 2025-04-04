"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User, Session } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"

type UserRole = "guest" | "admin" | "vendor" | null

type Profile = {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  email: string | null
  phone: string | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    success: boolean
  }>
  signUp: (
    email: string,
    password: string,
    role: "guest" | "admin" | "vendor",
    userData?: Partial<Profile>,
  ) => Promise<{
    error: Error | null
    success: boolean
  }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: null, success: false }),
  signUp: async () => ({ error: null, success: false }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching profile:", error)
        return null
      }

      setProfile(data as Profile)
      return data as Profile
    } catch (error) {
      console.error("Error fetching profile:", error)
      return null
    }
  }

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error("Error fetching session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error);
        return { error, success: false }
      }

      // Fetch the user's profile to get their role
      if (data.user) {
        console.log("User signed in successfully:", data.user.email);
        
        // Clear any cached profile data first
        setProfile(null);
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();
          
        if (profileError || !profileData) {
          console.error("Error fetching profile during login:", profileError);
          return { error: profileError || new Error("Could not fetch user profile"), success: false };
        }
        
        // Set the profile directly here
        console.log("User profile fetched with role:", profileData.role);
        setProfile(profileData as Profile);
        
        // Redirect based on role
        console.log("Redirecting based on role:", profileData.role);
        
        // Use a slightly longer timeout to ensure state is updated
        setTimeout(() => {
          switch (profileData.role) {
            case "admin":
              console.log("Redirecting admin to /admin/dashboard");
              router.push("/admin/dashboard");
              break;
            case "vendor":
              console.log("Redirecting vendor to /vendor/dashboard");
              router.push("/vendor/dashboard");
              break;
            case "guest":
              console.log("Redirecting guest to /explore");
              router.push("/explore");
              break;
            default:
              console.log("No role detected, redirecting to home");
              router.push("/");
          }
        }, 200);
      }

      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during login:", error);
      return { error: error as Error, success: false }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    role: "guest" | "admin" | "vendor",
    userData?: Partial<Profile>,
  ) => {
    try {
      // First check if the user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', email)
        .single();

      if (existingUser) {
        return { 
          error: new Error("A user with this email already exists. Please login instead."), 
          success: false 
        };
      }

      // If user doesn't exist, proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error("Auth signup error:", error);
        return { error, success: false }
      }

      if (data.user) {
        // Check if profile already exists for this user
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, role")
          .eq("id", data.user.id)
          .single();

        if (existingProfile) {
          console.log("Profile already exists, updating role", existingProfile);
          // Update existing profile with new role if needed
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ role, ...userData })
            .eq("id", data.user.id);

          if (updateError) {
            console.error("Profile update error:", updateError);
            return { error: updateError, success: false }
          }
        } else {
          // Create a new profile
          console.log("Creating new profile for user", data.user.id);
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([{
              id: data.user.id,
              role,
              email: data.user.email,
              ...userData,
            }]);

          if (profileError) {
            console.error("Profile creation error:", profileError);
            return { error: profileError, success: false }
          }
        }

        // Set the profile
        const profile = await fetchProfile(data.user.id)
        console.log("User signed up with role:", role)
        
        // Use setTimeout to ensure the profile state is updated before redirect
        setTimeout(() => {
          redirectBasedOnRole(role)
        }, 100)
      }

      return { error: null, success: true }
    } catch (error) {
      console.error("Unexpected error during signup:", error);
      return { error: error as Error, success: false }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push("/")
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    })
  }

  const redirectBasedOnRole = (role: UserRole) => {
    console.log("Redirecting based on role:", role)
    switch (role) {
      case "guest":
        router.push("/explore")
        break
      case "admin":
        router.push("/admin/dashboard")
        break
      case "vendor":
        router.push("/vendor/dashboard")
        break
      default:
        router.push("/")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}


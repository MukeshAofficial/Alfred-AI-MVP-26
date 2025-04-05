"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  withIcon?: boolean
  fullWidth?: boolean
  redirectTo?: string
}

export default function SignOutButton({ 
  variant = "ghost", 
  size = "default", 
  className = "", 
  withIcon = true,
  fullWidth = false,
  redirectTo = "/login"
}: SignOutButtonProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
      router.push(redirectTo)
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Sign out failed",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`${className} ${fullWidth ? "w-full" : ""}`}
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Signing out...
        </span>
      ) : (
        <span className="flex items-center">
          {withIcon && <LogOut className="mr-2 h-4 w-4" />}
          Sign out
        </span>
      )}
    </Button>
  )
} 
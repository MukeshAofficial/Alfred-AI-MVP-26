"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function SignOutButton({ 
  variant = "ghost", 
  size = "default",
  className = "" 
}: SignOutButtonProps) {
  const { signOut } = useAuth()

  return (
    <Button 
      variant={variant} 
      size={size}
      className={`flex items-center gap-2 ${className}`}
      onClick={signOut}
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </Button>
  )
} 
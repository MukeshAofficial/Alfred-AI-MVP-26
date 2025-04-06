"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ServiceForm from "@/components/vendor/service-form"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function NewServicePage() {
  const { profile, isLoading: profileLoading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !profileLoading && !profile) {
      // Only redirect if profile is not loading and definitely not present
      router.push("/login?redirectedFrom=/vendor/services/new")
    } else if (isClient && !profileLoading && profile?.role !== "vendor") {
      router.push("/403")
    }
  }, [profile, router, isClient, profileLoading])

  // Don't render anything during SSR to prevent hydration issues
  if (!isClient) {
    return null;
  }

  // Show loading state if profile is still loading
  if (profileLoading) {
    return (
      <div className="container py-8" suppressHydrationWarning>
        <Card>
          <CardContent className="flex items-center justify-center p-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p>Loading your profile...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Don't render if profile isn't loaded yet
  if (!profile) {
    return (
      <div className="container py-8" suppressHydrationWarning>
        <Card>
          <CardContent className="flex items-center justify-center p-10">
            <div className="text-center">
              <p>Please sign in to add a new service.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8" suppressHydrationWarning>
      <h1 className="text-2xl font-bold mb-6">Add New Service</h1>
      <ServiceForm />
    </div>
  )
}


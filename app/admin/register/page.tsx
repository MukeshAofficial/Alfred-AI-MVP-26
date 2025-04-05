"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function HotelRegistrationDetailsPage() {
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [hotelDetails, setHotelDetails] = useState({
    hotelName: "",
    description: "",
    address: "",
    amenities: "",
    phone: "",
    website: "",
    logo: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in or not an admin
  useEffect(() => {
    if (!profile) {
      router.push("/login")
    } else if (profile.role !== "admin") {
      router.push("/403")
    } else {
      // Pre-fill form with existing data if available
      if (profile.full_name) {
        setHotelDetails(prev => ({
          ...prev,
          hotelName: profile.full_name
        }))
      }
      if (profile.phone) {
        setHotelDetails(prev => ({
          ...prev,
          phone: profile.phone
        }))
      }
    }
  }, [profile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!profile?.id) {
        throw new Error("User profile not found")
      }

      // First update the profile with the hotel name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: hotelDetails.hotelName,
          phone: hotelDetails.phone,
        })
        .eq("id", profile.id)

      if (profileError) {
        throw profileError
      }

      // Parse amenities from textarea to JSON array
      const amenitiesArray = hotelDetails.amenities
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)

      // Check if hotel record already exists
      const { data: existingHotel } = await supabase
        .from("hotels")
        .select("id")
        .eq("admin_id", profile.id)
        .single()

      let hotelId = existingHotel?.id

      // If no hotel record exists, create one
      if (!hotelId) {
        const { data: newHotel, error: hotelError } = await supabase
          .from("hotels")
          .insert({
            admin_id: profile.id,
            name: hotelDetails.hotelName,
            address: hotelDetails.address,
            description: hotelDetails.description,
            amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
            images: hotelDetails.logo ? [hotelDetails.logo] : [],
          })
          .select()

        if (hotelError) {
          throw hotelError
        }

        hotelId = newHotel?.[0]?.id
      } else {
        // Update existing hotel record
        const { error: updateError } = await supabase
          .from("hotels")
          .update({
            name: hotelDetails.hotelName,
            address: hotelDetails.address,
            description: hotelDetails.description,
            amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
            images: hotelDetails.logo ? [hotelDetails.logo] : [],
          })
          .eq("id", hotelId)

        if (updateError) {
          throw updateError
        }
      }

      await refreshProfile()

      toast({
        title: "Registration completed",
        description: "Your hotel details have been saved successfully.",
      })

      // Redirect to admin dashboard
      router.push("/admin/dashboard")
    } catch (err: any) {
      console.error("Error saving hotel details:", err)
      setError(err.message || "An unexpected error occurred")
      toast({
        title: "Registration failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Complete your hotel profile</CardTitle>
          <CardDescription>Provide additional details about your hotel to start managing services</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hotelName">Hotel Name</Label>
              <Input
                id="hotelName"
                placeholder="Luxury Hotel & Spa"
                value={hotelDetails.hotelName}
                onChange={(e) => setHotelDetails({ ...hotelDetails, hotelName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Hotel Description</Label>
              <Textarea
                id="description"
                placeholder="Tell guests about your hotel and the experience you offer..."
                value={hotelDetails.description}
                onChange={(e) => setHotelDetails({ ...hotelDetails, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Hotel Address</Label>
              <Textarea
                id="address"
                placeholder="123 Luxury Avenue, City, Country"
                value={hotelDetails.address}
                onChange={(e) => setHotelDetails({ ...hotelDetails, address: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amenities">Amenities</Label>
              <Textarea
                id="amenities"
                placeholder="Enter amenities separated by commas (e.g., Pool, Spa, Restaurant, Gym)"
                value={hotelDetails.amenities}
                onChange={(e) => setHotelDetails({ ...hotelDetails, amenities: e.target.value })}
                rows={3}
              />
              <p className="text-sm text-muted-foreground">
                List the amenities your hotel offers, separated by commas.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={hotelDetails.phone}
                onChange={(e) => setHotelDetails({ ...hotelDetails, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourhotel.com"
                value={hotelDetails.website}
                onChange={(e) => setHotelDetails({ ...hotelDetails, website: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL (Optional)</Label>
              <Input
                id="logo"
                placeholder="https://yourhotel.com/logo.png"
                value={hotelDetails.logo}
                onChange={(e) => setHotelDetails({ ...hotelDetails, logo: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Provide a URL to your hotel logo image. We'll add image upload functionality soon.
              </p>
            </div>

            {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-500">{error}</div>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving details...
                </>
              ) : (
                "Complete Registration"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Your hotel details will be visible to guests using our platform. You can update this information anytime from your admin dashboard.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}


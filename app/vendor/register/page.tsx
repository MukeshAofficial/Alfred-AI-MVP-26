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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function VendorRegistrationDetailsPage() {
  const { profile, refreshProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const [businessDetails, setBusinessDetails] = useState({
    businessName: "",
    serviceType: "",
    description: "",
    address: "",
    website: "",
    logo: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in or not a vendor
  useEffect(() => {
    if (!profile) {
      router.push("/login")
    } else if (profile.role !== "vendor") {
      router.push("/403")
    } else {
      // Pre-fill form with existing data if available
      if (profile.full_name) {
        setBusinessDetails(prev => ({
          ...prev,
          businessName: profile.full_name
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

      // First update the profile with the business name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: businessDetails.businessName,
        })
        .eq("id", profile.id)

      if (profileError) {
        throw profileError
      }

      // Check if vendor record already exists
      const { data: existingVendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("vendor_id", profile.id)
        .single()

      let vendorId = existingVendor?.id

      // If no vendor record exists, create one
      if (!vendorId) {
        const { data: newVendor, error: vendorError } = await supabase
          .from("vendors")
          .insert({
            vendor_id: profile.id,
            business_name: businessDetails.businessName,
            service_type: businessDetails.serviceType,
            description: businessDetails.description,
            address: businessDetails.address,
            images: businessDetails.logo ? [businessDetails.logo] : [],
          })
          .select()

        if (vendorError) {
          throw vendorError
        }

        vendorId = newVendor?.[0]?.id
      } else {
        // Update existing vendor record
        const { error: updateError } = await supabase
          .from("vendors")
          .update({
            business_name: businessDetails.businessName,
            service_type: businessDetails.serviceType,
            description: businessDetails.description,
            address: businessDetails.address,
            images: businessDetails.logo ? [businessDetails.logo] : [],
          })
          .eq("id", vendorId)

        if (updateError) {
          throw updateError
        }
      }

      await refreshProfile()

      toast({
        title: "Registration completed",
        description: "Your business details have been saved successfully.",
      })

      // Redirect to vendor dashboard
      router.push("/vendor/dashboard")
    } catch (err: any) {
      console.error("Error saving vendor details:", err)
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
          <CardTitle className="text-2xl font-bold">Complete your vendor profile</CardTitle>
          <CardDescription>Provide additional details about your business to start offering services</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="Your Business Name"
                value={businessDetails.businessName}
                onChange={(e) => setBusinessDetails({ ...businessDetails, businessName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select 
                value={businessDetails.serviceType}
                onValueChange={(value) => setBusinessDetails({ ...businessDetails, serviceType: value })}
                required
              >
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="spa">Spa & Wellness</SelectItem>
                  <SelectItem value="tour">Tours & Excursions</SelectItem>
                  <SelectItem value="transport">Transportation</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                placeholder="Tell guests about your business and the services you offer..."
                value={businessDetails.description}
                onChange={(e) => setBusinessDetails({ ...businessDetails, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Textarea
                id="address"
                placeholder="Your business address"
                value={businessDetails.address}
                onChange={(e) => setBusinessDetails({ ...businessDetails, address: e.target.value })}
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourbusiness.com"
                value={businessDetails.website}
                onChange={(e) => setBusinessDetails({ ...businessDetails, website: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL (Optional)</Label>
              <Input
                id="logo"
                placeholder="https://yourbusiness.com/logo.png"
                value={businessDetails.logo}
                onChange={(e) => setBusinessDetails({ ...businessDetails, logo: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Provide a URL to your business logo image. We'll add image upload functionality soon.
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
            Your business details will be visible to hotel guests using our platform. You can update this information anytime from your vendor dashboard.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}


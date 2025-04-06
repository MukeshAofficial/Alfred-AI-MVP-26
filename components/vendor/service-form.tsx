"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, Plus, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ServicesDB, ServiceData, ServiceCategory } from "@/lib/services-db"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ServiceFormProps {
  serviceId?: string
  onSuccess?: () => void
}

export default function ServiceForm({ serviceId, onSuccess }: ServiceFormProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [servicesDB] = useState(() => new ServicesDB())
  const [isClient, setIsClient] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingService, setIsLoadingService] = useState(!!serviceId)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null)
  const [serviceData, setServiceData] = useState<Partial<ServiceData>>({
    name: "",
    description: "",
    price: 0,
    currency: "USD",
    category: "other" as ServiceCategory,
    duration: 60,
    images: [],
    location: "",
  })

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)
  }, [])

  // If serviceId is provided, fetch the service data
  useEffect(() => {
    if (isClient && serviceId) {
      const fetchService = async () => {
        try {
          const service = await servicesDB.getServiceById(serviceId)
          setServiceData(service)
        } catch (err) {
          console.error("Error fetching service:", err)
          toast({
            title: "Error",
            description: "Failed to load service data",
            variant: "destructive",
          })
        } finally {
          setIsLoadingService(false)
        }
      }
      fetchService()
    }
  }, [serviceId, toast, isClient, servicesDB])

  // Handle form input changes
  const handleChange = (field: keyof ServiceData, value: any) => {
    setServiceData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Handle number input changes with validation
  const handleNumberChange = (field: keyof ServiceData, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      handleChange(field, numValue)
    }
  }

  // Reset form to add a new service
  const handleAddAnother = () => {
    setSuccess(false)
    setCreatedServiceId(null)
    setServiceData({
      name: "",
      description: "",
      price: 0,
      currency: "USD",
      category: "other" as ServiceCategory,
      duration: 60,
      images: [],
      location: "",
    })
  }

  // View all services
  const handleViewAll = () => {
    router.push("/vendor/services")
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    if (!profile?.id) {
      setError("You must be logged in to create a service")
      setIsLoading(false)
      return
    }

    try {
      // Prepare data for submission
      const data = {
        ...serviceData,
        vendor_id: profile.id,
      } as ServiceData

      let result: ServiceData

      if (serviceId) {
        // Update existing service
        result = await servicesDB.updateService(serviceId, data)
        toast({
          title: "Service updated",
          description: "Your service has been updated successfully.",
        })
        setSuccess(true)
        setCreatedServiceId(result.id || null)
      } else {
        // Create new service
        result = await servicesDB.createService(data)
        toast({
          title: "Service created",
          description: "Your service has been created successfully.",
        })
        setSuccess(true)
        setCreatedServiceId(result.id || null)
      }

      if (onSuccess) {
        onSuccess()
      }
      // We'll stay on the page instead of redirecting
    } catch (err: any) {
      console.error("Error saving service:", err)
      setError(err.message || "An unexpected error occurred")
      toast({
        title: "Error saving service",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render anything during SSR to avoid hydration mismatches
  if (!isClient) {
    return null;
  }

  if (isLoadingService) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show success state if service was successfully created/updated
  if (success) {
    return (
      <Card className="border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-600 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Service {serviceId ? "Updated" : "Created"} Successfully
          </CardTitle>
          <CardDescription>
            Your service has been {serviceId ? "updated" : "saved"} to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="bg-green-50 border-green-200 mb-6">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your service "{serviceData.name}" has been {serviceId ? "updated" : "added"} successfully.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {!serviceId && (
              <Button onClick={handleAddAnother} className="flex-1 gap-2">
                <Plus className="h-4 w-4" />
                Add Another Service
              </Button>
            )}
            <Button 
              onClick={handleViewAll} 
              variant="outline" 
              className="flex-1 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              View All Services
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{serviceId ? "Edit Service" : "Create New Service"}</CardTitle>
        <CardDescription>
          {serviceId
            ? "Update your service details"
            : "Provide details about the service you offer"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              value={serviceData.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="E.g., Relaxation Massage, Sightseeing Tour"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Service Category</Label>
            <Select
              value={serviceData.category || "other"}
              onValueChange={(value) => handleChange("category", value as ServiceCategory)}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={serviceData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe your service in detail..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={serviceData.price || ""}
                onChange={(e) => handleNumberChange("price", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={serviceData.currency || "USD"}
                onValueChange={(value) => handleChange("currency", value)}
                required
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={serviceData.duration || ""}
                onChange={(e) => handleNumberChange("duration", e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Optional</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={serviceData.location || ""}
                onChange={(e) => handleChange("location", e.target.value)}
                placeholder="Where is this service provided?"
              />
              <p className="text-sm text-muted-foreground">Optional</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">Image URLs</Label>
            <Input
              id="images"
              value={serviceData.images?.join(", ") || ""}
              onChange={(e) => handleChange("images", e.target.value.split(",").map(url => url.trim()))}
              placeholder="Comma-separated image URLs"
            />
            <p className="text-sm text-muted-foreground">
              Provide comma-separated URLs to images of your service. We'll add image upload functionality soon.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {serviceId ? "Updating..." : "Creating..."}
              </>
            ) : (
              serviceId ? "Update Service" : "Create Service"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 
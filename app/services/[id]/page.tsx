"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, Clock, ChevronLeft, Calendar, DollarSign, Star, User, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServicesDB, ServiceData, ServiceCategory } from "@/lib/services-db"
import { useToast } from "@/components/ui/use-toast"
import { use } from "react"

interface ServicePageProps {
  params: {
    id: string
  }
}

export default function ServiceDetailPage({ params }: ServicePageProps) {
  // Properly unwrap params using React.use
  const unwrappedParams = use(params);
  const serviceId = unwrappedParams.id;

  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const servicesDB = new ServicesDB()

  const [service, setService] = useState<ServiceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    fetchService()
  }, [serviceId])

  const fetchService = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await servicesDB.getServiceById(serviceId)
      setService(data)
    } catch (err: any) {
      console.error("Error fetching service:", err)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBook = async () => {
    // Check if user is logged in
    if (!profile) {
      router.push(`/login?redirectedFrom=/services/${serviceId}`)
      return
    }

    // Navigate to checkout page with serviceId
    router.push(`/checkout?serviceId=${serviceId}`)
  }

  const getCategoryLabel = (category: ServiceCategory | undefined) => {
    switch (category) {
      case 'restaurant': return 'Restaurant';
      case 'spa': return 'Spa & Wellness';
      case 'tour': return 'Tours & Excursions';
      case 'transport': return 'Transportation';
      case 'entertainment': return 'Entertainment';
      case 'other': return 'Other';
      default: return 'Service';
    }
  }

  if (isLoading) {
    return (
      <div className="container py-12 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Service Not Found</h1>
              <p className="text-muted-foreground mb-6">
                {error || "The service you're looking for couldn't be found or has been removed."}
              </p>
              <Button onClick={() => router.push("/services")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Gallery */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {service.images && service.images.length > 0 ? (
              <img
                src={service.images[0]}
                alt={service.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/1200x800?text=No+Image"
                }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                No Image Available
              </div>
            )}
          </div>

          {/* Service info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">
                {getCategoryLabel(service.category as ServiceCategory)}
              </Badge>
              <div className="flex items-center text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="ml-1 text-sm">4.8</span>
                <span className="text-muted-foreground text-sm ml-1">(24 reviews)</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                <span>{service.business_name || "Service Provider"}</span>
              </div>
              {service.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{service.location}</span>
                </div>
              )}
              {service.duration && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{service.duration} minutes</span>
                </div>
              )}
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>{service.currency} {service.price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="pt-4">
              <p>{service.description}</p>
            </TabsContent>
            <TabsContent value="details" className="pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Service Details</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Duration: {service.duration} minutes</li>
                    <li>Category: {getCategoryLabel(service.category as ServiceCategory)}</li>
                    <li>Price: {service.currency} {service.price.toFixed(2)}</li>
                    {service.location && <li>Location: {service.location}</li>}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Service Provider</h3>
                  <p className="text-muted-foreground">
                    {service.business_name || "This service is provided by a verified partner."}
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="reviews" className="pt-4">
              <p className="text-muted-foreground">Reviews are coming soon!</p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Book this service</CardTitle>
              <CardDescription>
                Secure your booking instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{service.currency} {service.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{service.duration} minutes</span>
                </div>
                {service.location && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Location</span>
                    <span>{service.location}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-col space-y-2">
              <Button className="w-full" onClick={handleBook} disabled={isBooking}>
                {isBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Now
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full">
                <Heart className="mr-2 h-4 w-4" />
                Save for Later
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
} 
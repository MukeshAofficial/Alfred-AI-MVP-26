"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, DollarSign, Users, Calendar, Star, ArrowLeft, BadgeCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { SpaDB } from "@/lib/spa-db"
import { AdminSpa, AdminSpaService } from "@/types/spa"
import { createCheckoutSession } from "@/lib/actions"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

interface PageParams {
  id: string;
}

export default function SpaDetailsPage({ params }: { params: PageParams }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params)
  const spaId = unwrappedParams.id
  
  const [spa, setSpa] = useState<AdminSpa | null>(null)
  const [services, setServices] = useState<AdminSpaService[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<AdminSpaService | null>(null)
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(getTomorrowDate())
  const [processingPayment, setProcessingPayment] = useState(false)
  const [dbSetupError, setDbSetupError] = useState<string | null>(null)
  
  // Get tomorrow's date for default booking date
  function getTomorrowDate() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }
  
  const fetchSpaDetails = async () => {
    setLoading(true)
    setDbSetupError(null)
    try {
      const spaDb = SpaDB.getInstance()
      
      // Check if tables exist first
      const tablesExist = await spaDb.checkTablesExist();
      if (!tablesExist) {
        setDbSetupError("Required database tables do not exist. The system needs to be initialized.");
        setLoading(false);
        return;
      }
      
      // Get the spa's details
      const spaData = await spaDb.getSpaById(spaId)
      setSpa(spaData)
      
      // Get the spa's services
      if (spaData) {
        const servicesData = await spaDb.getSpaServicesBySpaId(spaData.id)
        setServices(servicesData)
      }
    } catch (error) {
      console.error("Failed to fetch spa details:", error)
      let errorMessage = "Could not load spa information. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for database setup errors
        if (errorMessage.includes("database") && errorMessage.includes("tables")) {
          setDbSetupError(errorMessage)
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchSpaDetails()
  }, [spaId])
  
  const handleBooking = async () => {
    if (!selectedService || !selectedDate) return
    
    setProcessingPayment(true)
    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0]
      
      // Create a Stripe checkout session
      const result = await createCheckoutSession({
        serviceId: selectedService.id,
        bookingDate: formattedDate,
        userId: user?.id,
      })
      
      if (result?.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl
      } else {
        throw new Error("Could not create checkout session")
      }
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "There was a problem processing your booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingPayment(false)
    }
  }
  
  // Format price with currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }
  
  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "unavailable":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      case "featured":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={spa?.name || "Spa Details"} />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-2"
          onClick={() => router.push("/spa-services")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Spa Services
          </Button>
        
        {dbSetupError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Database Setup Required</AlertTitle>
            <AlertDescription>
              {dbSetupError}
            </AlertDescription>
          </Alert>
        )}
        
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            </div>
        ) : dbSetupError ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-amber-600 mb-4">Database Setup Required</h2>
            <p className="text-muted-foreground mb-6">{dbSetupError}</p>
            <div className="max-w-xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-md">
              <p className="mb-4">To fix this issue, you need to initialize the database with required tables:</p>
              <ol className="list-decimal list-inside text-left mb-4 space-y-2">
                <li>Please contact the system administrator to initialize the database</li>
                <li>Once the initialization is complete, you can view spa services</li>
              </ol>
                              <Button
                onClick={() => router.push('/spa-services')}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Go Back
                              </Button>
            </div>
          </div>
        ) : spa ? (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{spa.name}</h1>
              <div className="flex items-center mb-4">
                <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-muted-foreground">{spa.location}</span>
              </div>
              <p className="text-gray-600 mb-4">{spa.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Opening Hours</p>
                    <p className="text-sm text-gray-600">
                      Mon-Fri: {spa.opening_hours.monday.start} - {spa.opening_hours.monday.end}
                    </p>
                    <p className="text-sm text-gray-600">
                      Sat-Sun: {spa.opening_hours.saturday.start} - {spa.opening_hours.saturday.end}
                    </p>
                  </div>
                </div>

                {spa.capacity && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Capacity</p>
                      <p className="text-sm text-gray-600">{spa.capacity} people</p>
                    </div>
                  </div>
                )}
                
                {spa.amenities && spa.amenities.length > 0 && (
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <BadgeCheck className="h-5 w-5 mr-2 text-primary" />
                <div>
                      <p className="text-sm font-medium">Amenities</p>
                      <p className="text-sm text-gray-600">
                        {spa.amenities.slice(0, 3).join(", ")}
                        {spa.amenities.length > 3 && `... +${spa.amenities.length - 3} more`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-4">Available Services</h2>
            {services.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No services available at this spa.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="mr-2">{service.name}</CardTitle>
                        <Badge className={getServiceStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{formatPrice(service.price, service.currency)}</span>
                    </div>
                        
                        {service.duration && (
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{service.duration} minutes</span>
                  </div>
                        )}
                </div>
              </CardContent>
                    
                    <CardFooter>
                      <Button 
                        className="w-full"
                        disabled={service.status !== 'available'}
                        onClick={() => {
                          setSelectedService(service)
                          setIsBookingDialogOpen(true)
                        }}
                      >
                        Book Now
                      </Button>
                    </CardFooter>
            </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg mb-4">Spa not found</p>
            <Button 
              variant="outline" 
              onClick={() => router.push("/spa-services")}
            >
              View All Spas
            </Button>
        </div>
        )}
      </main>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Select a date for your spa appointment.
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="font-medium">{selectedService.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedService.duration} minutes - {formatPrice(selectedService.price, selectedService.currency)}</p>
            </div>

              <div className="space-y-4">
            <div>
                  <h4 className="text-sm font-medium mb-2">Select Date</h4>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 3))}
                    className="border rounded-md p-2"
                  />
                </div>
              </div>
                </div>
              )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!selectedDate || processingPayment} 
              onClick={handleBooking}
            >
              {processingPayment ? "Processing..." : "Proceed to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  )
}


"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MapPin, Star, Clock, DollarSign, Calendar, Users, ArrowRight, BadgeCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { SpaDB } from "@/lib/spa-db"
import { AdminSpa, AdminSpaService } from "@/types/spa"
import { createCheckoutSession } from "@/lib/actions"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function SpaServicesPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [spas, setSpas] = useState<AdminSpa[]>([])
  const [services, setServices] = useState<AdminSpaService[]>([])
  const [activeTab, setActiveTab] = useState("spas")
  const [selectedSpa, setSelectedSpa] = useState<AdminSpa | null>(null)
  const [selectedService, setSelectedService] = useState<AdminSpaService | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [bookingDate, setBookingDate] = useState<string>(getTomorrowDate())
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(getTomorrowDate()))
  const [isBooking, setIsBooking] = useState(false)
  const [showBookingDialog, setShowBookingDialog] = useState(false)
  const [dbSetupError, setDbSetupError] = useState<string | null>(null)
  
  // Get tomorrow's date formatted as YYYY-MM-DD for the default booking date
  function getTomorrowDate() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
  
  useEffect(() => {
    fetchSpas()
  }, [])
  
  useEffect(() => {
    if (selectedSpa) {
      fetchSpaServices(selectedSpa.id)
    } else {
      setServices([])
    }
  }, [selectedSpa])
  
  // Update bookingDate when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setBookingDate(selectedDate.toISOString().split('T')[0])
    }
  }, [selectedDate])
  
  const fetchSpas = async () => {
    setLoading(true)
    setDbSetupError(null)
    try {
      const spaDB = SpaDB.getInstance()
      
      // Check if tables exist first
      const tablesExist = await spaDB.checkTablesExist();
      if (!tablesExist) {
        setDbSetupError("Required database tables do not exist. The system needs to be initialized.");
        setLoading(false);
        return;
      }
      
      // If tables exist, fetch spas
      const spasData = await spaDB.getAllSpas()
      
      // Filter only active spas
      const activeSpas = spasData.filter(spa => spa.status === 'active')
      setSpas(activeSpas)
      
      // Select the first spa by default if available
      if (activeSpas.length > 0) {
        setSelectedSpa(activeSpas[0])
      }
    } catch (error) {
      console.error("Failed to fetch spas:", error)
      let errorMessage = "Failed to load spa facilities. Please try again."
      
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
  
  const fetchSpaServices = async (spaId: string) => {
    try {
      const spaDB = SpaDB.getInstance()
      const servicesData = await spaDB.getSpaServicesBySpaId(spaId)
      
      // Filter only available services
      const availableServices = servicesData.filter(service => service.status === 'available')
      setServices(availableServices)
      
      // Select featured service by default if available
      const featuredService = availableServices.find(service => service.status === 'featured')
      if (featuredService) {
        setSelectedService(featuredService)
      } else if (availableServices.length > 0) {
        setSelectedService(availableServices[0])
      } else {
        setSelectedService(null)
      }
    } catch (error) {
      console.error(`Failed to fetch services for spa ${spaId}:`, error)
      // Clear any services that might have been loaded
      setServices([])
      setSelectedService(null)
      
      // Check for database setup errors
      if (error instanceof Error) {
        const errorMessage = error.message
        if (errorMessage.includes('database') || errorMessage.includes('table')) {
          setDbSetupError(errorMessage)
          toast({
            title: "Database Setup Required",
            description: errorMessage,
            variant: "destructive",
          })
          return
        }
      }
      
      toast({
        title: "Error",
        description: "Failed to load spa services. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBookService = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setSelectedService(service)
      setShowBookingDialog(true)
    }
  }
  
  const handleBooking = async () => {
    if (!selectedService || !bookingDate || !profile || !profile.id) {
      toast({
        title: "Error",
        description: "Please select a service, date, and log in to book.",
        variant: "destructive",
      })
      return
    }
    
    setIsBooking(true)
    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = bookingDate
      
      // Create a Stripe checkout session
      const result = await createCheckoutSession({
        serviceId: selectedService.id,
        bookingDate: formattedDate,
        userId: profile.id,
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
      setIsBooking(false)
    }
  }

  const filteredSpas = spas.filter((spa) => {
    // Filter by search term
    const matchesSearch =
      spa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spa.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spa.location.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })
  
  const filteredServices = services.filter((service) => {
    // Filter by search term
    const matchesSearch =
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Function to get price range based on the average price of services
  const getSpaPrice = (spa: AdminSpa) => {
    const spaServices = services.filter(service => service.spa_id === spa.id)
    return spaServices.length > 0 
      ? Math.min(...spaServices.map(service => service.price))
      : 0
  }
  
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Spa & Wellness" />

      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Spa & Wellness Center</h1>
          <p className="text-gray-600">Browse our luxury spas and book treatments</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search spas or services..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        {dbSetupError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Database Setup Required</AlertTitle>
            <AlertDescription>
              {dbSetupError}
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="mb-2">
            <TabsTrigger value="spas">Spa Centers</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="spas">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                // Skeleton loading state for spas
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredSpas.length > 0 ? (
                filteredSpas.map((spa) => (
                  <Card
                    key={spa.id}
                    className={`overflow-hidden cursor-pointer transition-shadow ${
                      selectedSpa?.id === spa.id ? 'border-2 border-purple-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => {
                      setSelectedSpa(spa)
                      setActiveTab("services")
                    }}
                  >
                    <div className="h-40 relative">
                      <img
                        src={spa.images && spa.images.length > 0 ? spa.images[0] : "/placeholder.svg"}
                        alt={spa.name}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-purple-100 text-purple-800 hover:bg-purple-100">
                        {getSpaPrice(spa)}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium text-lg">{spa.name}</h3>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span>{(4 + Math.random()).toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{spa.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{spa.location}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mb-3">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          Opens: {spa.opening_hours.monday.start} - {spa.opening_hours.monday.end}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="px-4 py-3 border-t flex justify-between items-center">
                      <span className="text-sm text-gray-500">{spa.service_count || 0} services</span>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                        View Services
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500 mb-4">No spa centers found matching your criteria.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="services">
            {selectedSpa ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-2">
                    {spas.find(s => s.id === selectedSpa.id)?.name} - Available Services
                  </h2>
                  <p className="text-gray-600">
                    Select a service below to book your treatment
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    // Skeleton loading state for services
                    [...Array(4)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-4">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full mb-4" />
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-6 w-1/4" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredServices.length > 0 ? (
                    filteredServices.map((service) => (
                      <Card key={service.id} className="overflow-hidden">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <CardTitle>{service.name}</CardTitle>
                            <div className="text-lg font-bold text-purple-600">
                              {formatPrice(service.price, service.currency)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-4">{service.description}</p>
                          
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center text-sm">
                              <Clock className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{service.duration} minutes</span>
                            </div>
                            
                            {service.therapists && service.therapists.length > 0 && (
                              <div className="flex items-center text-sm">
                                <Users className="h-4 w-4 mr-2 text-gray-500" />
                                <span>
                                  {service.therapists.length} {service.therapists.length === 1 ? 'therapist' : 'therapists'} available
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                          <Button 
                            className="w-full" 
                            onClick={() => handleBookService(service.id)}
                          >
                            Book Now
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-500 mb-4">No services available for this spa at the moment.</p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("spas")}
                      >
                        Choose Another Spa
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Please select a spa center first to view available services.</p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("spas")}
                >
                  View Spa Centers
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Navigation />
      
      {/* Booking Dialog */}
      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Your Treatment</DialogTitle>
            <DialogDescription>
              Complete your booking details to proceed to payment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">Service Details</h4>
              {selectedService && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">{selectedService.name}</p>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{selectedService.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-sm font-medium text-purple-600 mt-1">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>
                      {formatPrice(selectedService.price, selectedService.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="booking-date">
                Select Date
              </label>
              <div className="relative">
                <CalendarComponent
                  className="w-full pl-10 pr-3 py-2 border rounded-md"
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                    }
                  }}
                  disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 3))}
                  initialFocus
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBooking} 
              disabled={isBooking}
            >
              {isBooking ? "Processing..." : "Proceed to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


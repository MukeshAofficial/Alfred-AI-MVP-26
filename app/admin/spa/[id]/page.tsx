"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Edit, Trash2, Plus, MapPin, Clock, Users, DollarSign, Calendar, Tag, User, Mail, Phone, Database, CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { AdminSpa, AdminSpaService, AdminSpaBooking } from "@/types/spa"
import { SpaDB } from "@/lib/spa-db"
import { NewServiceForm } from "@/components/new-service-form"

export default function SpaDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter()
  const { toast } = useToast()
  const spaDb = SpaDB.getInstance()
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params)
  const spaId = unwrappedParams.id
  
  const [spa, setSpa] = useState<AdminSpa | null>(null)
  const [services, setServices] = useState<AdminSpaService[]>([])
  const [bookings, setBookings] = useState<AdminSpaBooking[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  
  const [serviceToDelete, setServiceToDelete] = useState<AdminSpaService | null>(null)
  const [isDeleteServiceDialogOpen, setIsDeleteServiceDialogOpen] = useState(false)
  
  const [bookingToDelete, setBookingToDelete] = useState<AdminSpaBooking | null>(null)
  const [isDeleteBookingDialogOpen, setIsDeleteBookingDialogOpen] = useState(false)
  
  const [isBookingsTableMissing, setIsBookingsTableMissing] = useState(false)
  
  useEffect(() => {
    fetchSpaDetails()
  }, [spaId])
  
  const fetchSpaDetails = async () => {
    setLoading(true)
    try {
      // Check if tables exist first to handle more gracefully
      const tableStatus = await spaDb.checkTablesExist();
      setIsBookingsTableMissing(!tableStatus.bookingsExist);
      
      // Fetch the spa details
      const spaData = await spaDb.getSpaById(spaId)
      setSpa(spaData)
      
      if (spaData) {
        try {
          // Fetch spa services
          const servicesData = await spaDb.getSpaServicesBySpaId(spaId)
          setServices(servicesData)
        } catch (serviceError) {
          console.error("Failed to fetch spa services:", serviceError)
          // Don't fail the entire page loading if just services fail
          // But show a toast for the specific error
          if (serviceError instanceof Error) {
            if (serviceError.message.includes('database') || serviceError.message.includes('table')) {
              toast({
                title: "Database Setup Issue",
                description: serviceError.message,
                variant: "destructive",
              })
            } else {
              toast({
                title: "Service Loading Error",
                description: "Failed to load spa services. Database might need setup.",
                variant: "destructive",
              })
            }
          }
          setServices([])
        }
        
        try {
          // Fetch spa bookings - will return empty array if table doesn't exist
          const bookingsData = await spaDb.getSpaBookingsBySpaId(spaId)
          setBookings(bookingsData)
          
          // If bookings table doesn't exist, show notification
          if (!tableStatus.bookingsExist && bookingsData.length === 0) {
            toast({
              title: "Missing Bookings Table",
              description: "The bookings table doesn't exist yet. Please initialize the database fully.",
              variant: "destructive",
            })
          }
        } catch (bookingError) {
          console.error("Failed to fetch spa bookings:", bookingError)
          // Don't fail the entire page loading if just bookings fail
          setBookings([])
        }
        
        try {
          // Fetch stats - will return default data if tables don't exist
          const statsData = await spaDb.getSpaEarningStats(spaId)
          setStats(statsData)
          
          // Show notification if stats are using partial data
          if (statsData && (statsData.missingTables || statsData.partialData)) {
            toast({
              title: "Limited Statistics Available",
              description: "Some database tables are missing or not fully set up. Statistics are limited.",
              variant: "destructive",
            })
          }
        } catch (statsError) {
          console.error("Failed to fetch spa stats:", statsError)
          // Don't fail the entire page loading if just stats fail
          setStats(null)
        }
        
        // If only some tables exist, show a notification about partial initialization
        if (tableStatus.spasExist && tableStatus.servicesExist && !tableStatus.bookingsExist) {
          toast({
            title: "Database Partially Initialized",
            description: "The database is only partially initialized. Please complete the setup to enable all features.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch spa details:", error)
      
      // Check for database-specific errors
      if (error instanceof Error) {
        const errorMessage = error.message
        if (errorMessage.includes('database') || errorMessage.includes('table')) {
          toast({
            title: "Database Setup Required",
            description: errorMessage,
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to load spa details. Please try again.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load spa details. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteService = async () => {
    if (!serviceToDelete) return
    
    try {
      const success = await spaDb.deleteSpaService(serviceToDelete.id)
      if (success) {
        toast({
          title: "Success",
          description: `Service "${serviceToDelete.name}" has been deleted.`,
        })
        // Refresh the services list
        const servicesData = await spaDb.getSpaServicesBySpaId(spaId)
        setServices(servicesData)
      } else {
        throw new Error("Failed to delete service")
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteServiceDialogOpen(false)
      setServiceToDelete(null)
    }
  }
  
  const openDeleteServiceDialog = (service: AdminSpaService) => {
    setServiceToDelete(service)
    setIsDeleteServiceDialogOpen(true)
  }
  
  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return
    
    try {
      const success = await spaDb.deleteSpaBooking(bookingToDelete.id)
      if (success) {
        toast({
          title: "Success",
          description: `Booking for "${bookingToDelete.guest_name}" has been deleted.`,
        })
        // Refresh the bookings list
        const bookingsData = await spaDb.getSpaBookingsBySpaId(spaId)
        setBookings(bookingsData)
      } else {
        throw new Error("Failed to delete booking")
      }
    } catch (error) {
      console.error("Error deleting booking:", error)
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteBookingDialogOpen(false)
      setBookingToDelete(null)
    }
  }
  
  const openDeleteBookingDialog = (booking: AdminSpaBooking) => {
    setBookingToDelete(booking)
    setIsDeleteBookingDialogOpen(true)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "inactive":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      case "maintenance":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
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
  
  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "rescheduled":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }
  
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "unpaid":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "refunded":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }
  
  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(price)
  }
  
  if (loading) {
    return (
      <div className="container py-12 text-center">
        <p>Loading spa details...</p>
      </div>
    )
  }
  
  if (!spa) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-3xl font-bold mb-4">Spa Not Found</h1>
        <p className="mb-6">The spa you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push("/admin/spa")}>
          Back to Spas
        </Button>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/admin/spa")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Spas
        </Button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{spa.name}</h1>
            <Badge className={getStatusColor(spa.status)}>
              {spa.status}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/spa/${spaId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Spa
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{spa.location}</p>
                  </div>
                </div>
                
                {spa.capacity && (
                  <div className="flex items-start">
                    <Users className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Capacity</p>
                      <p className="text-sm text-muted-foreground">{spa.capacity} people</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <Clock className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Opening Hours</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Monday-Friday: {spa.opening_hours.monday.start} - {spa.opening_hours.monday.end}</p>
                      <p>Saturday-Sunday: {spa.opening_hours.saturday.start} - {spa.opening_hours.saturday.end}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start">
                  <DollarSign className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Total Earnings</p>
                    <p className="text-sm text-muted-foreground">
                      {stats ? formatPrice(stats.totalEarnings) : "Calculating..."}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Bookings</p>
                    <div className="text-sm text-muted-foreground">
                      <p>Completed: {stats ? stats.completedBookings : "0"}</p>
                      <p>Upcoming: {stats ? stats.upcomingBookings : "0"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Tag className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Services</p>
                    <p className="text-sm text-muted-foreground">Total: {services.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{spa.description}</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Top Services</CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.topServices && stats.topServices.length > 0 ? (
                <ul className="space-y-2">
                  {stats.topServices.map((service: any, index: number) => (
                    <li key={index} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <span>{service.name}</span>
                      <Badge variant="outline">
                        {service.bookings} bookings
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No booking data available for services.</p>
              )}
            </CardContent>
          </Card>
          
          {/* Could add a chart for earnings by month here if you have a charting library */}
        </TabsContent>
        
        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Services</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add New Service for {spa.name}</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new spa service.
                  </DialogDescription>
                </DialogHeader>
                <NewServiceForm spaId={spaId} onSuccess={() => {
                  fetchSpaDetails()
                }} />
              </DialogContent>
            </Dialog>
          </div>
          
          {services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No services found for this spa</p>
            </div>
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
                      
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{service.booking_count || 0} bookings</span>
                      </div>
                      
                      {service.therapists && service.therapists.length > 0 && (
                        <div className="flex flex-col text-sm mt-2">
                          <span className="font-medium mb-1">Therapists:</span>
                          <div className="flex flex-wrap gap-1">
                            {service.therapists.map((therapist, index) => (
                              <Badge key={index} variant="outline" className="bg-gray-100 dark:bg-gray-800">
                                {therapist}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/spa-services/${service.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openDeleteServiceDialog(service)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="bookings" className="space-y-6">
          {isBookingsTableMissing ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <Database className="h-12 w-12 mx-auto text-amber-500" />
              </div>
              <h3 className="text-xl font-medium mb-2">Bookings Table Not Set Up</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The bookings database table hasn't been fully set up yet. You need to complete the database initialization.
              </p>
              <Button 
                onClick={() => router.push("/admin/spa")}
                variant="outline"
                className="bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
              >
                Go to Setup Page
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <CalendarX className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No Bookings Found</h3>
              <p className="text-muted-foreground mb-4">
                There are currently no bookings for this spa.
              </p>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.map((booking) => (
                  <Card key={booking.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            {booking.service?.name || "Unknown Service"}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(booking.booking_date)} at {formatTime(booking.booking_date)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getBookingStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          <Badge className={getPaymentStatusColor(booking.payment_status)}>
                            {booking.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <User className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Guest</p>
                              <p className="text-sm text-muted-foreground">{booking.guest_name}</p>
                            </div>
                          </div>
                          
                          {booking.guest_email && (
                            <div className="flex items-start">
                              <Mail className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Email</p>
                                <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                              </div>
                            </div>
                          )}
                          
                          {booking.guest_phone && (
                            <div className="flex items-start">
                              <Phone className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Phone</p>
                                <p className="text-sm text-muted-foreground">{booking.guest_phone}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {booking.therapist_assigned && (
                            <div className="flex items-start">
                              <User className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Therapist</p>
                                <p className="text-sm text-muted-foreground">{booking.therapist_assigned}</p>
                              </div>
                            </div>
                          )}
                          
                          {booking.amount_paid && (
                            <div className="flex items-start">
                              <DollarSign className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                              <div>
                                <p className="font-medium">Payment</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatPrice(booking.amount_paid, booking.currency)}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {booking.special_requests && (
                            <div className="flex items-start">
                              <div>
                                <p className="font-medium">Special Requests</p>
                                <p className="text-sm text-muted-foreground">{booking.special_requests}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/spa-bookings/${booking.id}`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openDeleteBookingDialog(booking)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Delete Service Dialog */}
      <Dialog open={isDeleteServiceDialogOpen} onOpenChange={setIsDeleteServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the service "{serviceToDelete?.name}"?
              This action cannot be undone and will also delete all bookings associated with this service.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Booking Dialog */}
      <Dialog open={isDeleteBookingDialogOpen} onOpenChange={setIsDeleteBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the booking for "{bookingToDelete?.guest_name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
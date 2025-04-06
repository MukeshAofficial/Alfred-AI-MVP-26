"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Calendar, Clock, MapPin, Users, CreditCard, ArrowRight, Edit, X, Loader2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { BookingsDB, BookingData } from "@/lib/bookings-db"
import { useAuth } from "@/contexts/auth-context"

interface UserBookingsProps {
  compactMode?: boolean;
}

export default function UserBookings({ compactMode = false }: UserBookingsProps) {
  const [activeTab, setActiveTab] = useState("confirmed")
  const { toast } = useToast()
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for success parameter in URL (coming from Stripe success redirect)
    const success = searchParams?.get('success')
    const sessionId = searchParams?.get('session_id')
    const bookingDate = searchParams?.get('booking_date')
    
    if (success === 'true' && sessionId) {
      console.log(`Detected successful payment with session ID: ${sessionId}`);
      
      toast({
        title: "Booking Confirmed!",
        description: "Your payment was successful and your booking has been confirmed.",
        variant: "default",
      })
      
      // Force refresh bookings when coming from successful checkout
      if (profile?.id) {
        console.log(`Refreshing bookings for user ${profile.id} after successful payment`);
        fetchUserBookings(profile.id)
      }
    }
  }, [searchParams, toast, profile?.id])

  useEffect(() => {
    if (profile?.id) {
      console.log(`Initial booking fetch for user: ${profile.id}`);
      fetchUserBookings(profile.id)
    } else {
      console.log('No user profile ID available to fetch bookings');
      setIsLoading(false);
    }
  }, [profile?.id])

  const fetchUserBookings = async (userId: string) => {
    console.log(`Starting to fetch bookings for user: ${userId}`);
    setIsLoading(true)
    setError(null)
    try {
      const bookingsDB = new BookingsDB()
      console.log('BookingsDB instance created');
      const data = await bookingsDB.getUserBookings(userId)
      console.log(`Successfully fetched ${data.length} bookings`);
      setBookings(data)
      
      // If we got zero bookings, check if there's a recent checkout session that might need fallback processing
      if (data.length === 0) {
        const lastSessionStr = localStorage.getItem('lastCheckoutSession');
        
        if (lastSessionStr) {
          try {
            const lastSession = JSON.parse(lastSessionStr);
            const sessionAge = Date.now() - lastSession.timestamp;
            
            // If the session is less than 30 minutes old and we have no bookings, show a helpful message
            if (sessionAge < 30 * 60 * 1000) {
              console.log('Recent checkout session found with no bookings - might need fallback processing');
              toast({
                title: "Recent booking found",
                description: "You have a recent checkout that might still be processing. Try refreshing in a moment.",
                duration: 6000,
              });
            }
          } catch (e) {
            console.error('Error parsing last checkout session:', e);
          }
        }
      }
    } catch (err: any) {
      console.error("Error fetching bookings:", err)
      console.error("Error details:", err.message || "Unknown error");
      if (err.stack) {
        console.error("Stack trace:", err.stack);
      }
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const refreshBookings = () => {
    if (profile?.id) {
      setIsRefreshing(true);
      fetchUserBookings(profile.id);
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "spa":
        return <Calendar className="h-4 w-4" />
      case "restaurant":
        return <Clock className="h-4 w-4" />
      case "tour":
        return <MapPin className="h-4 w-4" />
      case "transport":
        return <Users className="h-4 w-4" />
      case "entertainment":
        return <Calendar className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "canceled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "rescheduled":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const cancelBooking = async (id: string) => {
    try {
      const bookingsDB = new BookingsDB()
      await bookingsDB.updateBookingStatus(id, "canceled")
      
      // Update local state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === id ? { ...booking, status: "canceled" } : booking
        )
      )

    toast({
      title: "Booking Cancelled",
      description: "Your booking has been cancelled successfully.",
    })
    } catch (err: any) {
      console.error("Error cancelling booking:", err)
      toast({
        title: "Error",
        description: "Failed to cancel booking. Please try again.",
        variant: "destructive",
      })
    }
  }

  const requestAddOn = (id: string, addon: string) => {
    toast({
      title: "Add-on Requested",
      description: `Your request for ${addon} has been submitted.`,
    })
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled"
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => booking.status === activeTab)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your bookings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-2">Error loading bookings</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => profile?.id && fetchUserBookings(profile.id)}>
          Try Again
        </Button>
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-muted-foreground mb-6">You don't have any bookings yet</p>
        
        <div className="flex flex-col items-center space-y-4">
          <Button variant="outline" onClick={refreshBookings} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh Bookings
              </>
            )}
          </Button>
          
          <Button variant="default" onClick={() => window.location.href = "/services"}>
            Browse Services
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("container mx-auto pb-20", compactMode ? "p-0" : "max-w-md p-4")}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="canceled">Canceled</TabsTrigger>
            <TabsTrigger value="rescheduled">Rescheduled</TabsTrigger>
        </TabsList>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshBookings}
            disabled={isRefreshing}
            className="ml-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Bookings
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredBookings.length} {filteredBookings.length === 1 ? "booking" : "bookings"}
              </p>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No {activeTab} bookings found</p>
                {activeTab !== "confirmed" && (
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab("confirmed")}>
                    View Confirmed Bookings
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card key={booking.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{booking.service_name}</h3>
                            <p className="text-sm text-muted-foreground">{booking.service_category}</p>
                          </div>
                          <Badge className={cn("font-normal", getStatusColor(booking.status))}>
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{booking.booking_date ? formatDate(booking.booking_date) : "Not scheduled"}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{booking.metadata?.time || "Not specified"}</span>
                          </div>
                          {booking.service_location && (
                            <div className="flex items-center col-span-2">
                              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>{booking.service_location}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{booking.currency || booking.service_currency} {booking.amount_paid || booking.service_price}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-muted-foreground">Ref: {booking.id.substring(0, 8)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t pt-3">
                          {activeTab === "confirmed" && (
                          <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">
                                  <X className="h-3.5 w-3.5 mr-1" />
                                  Cancel
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>Cancel Booking</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {}}>
                                    Keep Booking
                                  </Button>
                                  <Button variant="destructive" onClick={() => cancelBooking(booking.id)}>
                                  Cancel Booking
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="ml-auto h-8">
                                Add-ons
                                <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => requestAddOn(booking.id, "Early check-in")}>
                                Request early check-in
                                  </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => requestAddOn(booking.id, "Special occasion setup")}>
                                Special occasion setup
                                  </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => requestAddOn(booking.id, "Dietary preferences")}>
                                Specify dietary preferences
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


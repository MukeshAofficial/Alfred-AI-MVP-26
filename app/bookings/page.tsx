"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Utensils, SpadeIcon as Spa, Ticket, Loader2 } from "lucide-react"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { useMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { BookingsDB, BookingData } from "@/lib/bookings-db"

// Add the missing import
import { cn } from "@/lib/utils"

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("upcoming")
  const isMobile = useMobile()
  const router = useRouter()
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.id) {
      fetchUserBookings(profile.id)
    }
  }, [profile?.id])

  const fetchUserBookings = async (userId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const bookingsDB = new BookingsDB()
      const data = await bookingsDB.getUserBookings(userId)
      setBookings(data)
    } catch (err: any) {
      console.error("Error fetching bookings:", err)
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const upcomingBookings = bookings.filter(
    (booking) => 
      booking.status !== "completed" && 
      booking.status !== "canceled" && 
      new Date(booking.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  const pastBookings = bookings.filter(
    (booking) => 
      booking.status === "completed" || 
      (booking.status === "canceled") ||
      new Date(booking.created_at) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  )

  const getBookingIcon = (category: string) => {
    switch (category) {
      case "restaurant":
        return <Utensils className="h-5 w-5 text-orange-500" />
      case "spa":
        return <Spa className="h-5 w-5 text-blue-500" />
      case "tour":
        return <Ticket className="h-5 w-5 text-purple-500" />
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("en-US", options)
  }

  const handleNewBooking = (type: string) => {
    switch (type) {
      case "restaurant":
        router.push("/restaurants")
        break
      case "spa":
        router.push("/spa-services")
        break
      case "tour":
        router.push("/explore")
        break
      default:
        router.push("/services")
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Bookings & Reservations" showNotification />
        <div className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-center">Please log in to view your bookings.</p>
              <Button 
                className="w-full mt-4" 
                onClick={() => router.push('/login')}
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Bookings & Reservations" showNotification />
        <div className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your bookings...</p>
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Bookings & Reservations" showNotification />
        <div className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-red-500 mb-2">Error loading bookings</p>
              <p className="text-center text-muted-foreground mb-4">{error}</p>
              <Button 
                className="w-full" 
                onClick={() => profile?.id && fetchUserBookings(profile.id)}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Bookings & Reservations" showNotification />

      <div className={cn("container mx-auto px-4 py-6 flex-1 pb-20", isMobile ? "pb-20" : "")}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main Content */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming">
                <div className="space-y-4">
                  {upcomingBookings.length > 0 ? (
                    upcomingBookings.map((booking) => (
                      <Card key={booking.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex">
                            <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                              <img
                                src={booking.service?.image_url || "/placeholder.svg"}
                                alt={booking.service?.name || "Service"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-4 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {getBookingIcon(booking.service?.category || "")}
                                    <h3 className="font-medium">{booking.service?.name || "Service Booking"}</h3>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{formatDate(booking.booking_date || booking.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>{booking.metadata?.time || "Time not specified"}</span>
                                      {booking.metadata?.duration && <span> • {booking.metadata.duration}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>{booking.service?.location || "Location not specified"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <span
                                    className={cn(
                                      "text-xs px-2 py-1 rounded-full",
                                      booking.status === "confirmed"
                                        ? "bg-green-100 text-green-800"
                                        : booking.status === "pending"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                    )}
                                  >
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Upcoming Bookings</h3>
                      <p className="text-gray-500 mb-6">You don't have any upcoming bookings or reservations.</p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <Button onClick={() => handleNewBooking("restaurant")}>Book Restaurant</Button>
                        <Button variant="outline" onClick={() => handleNewBooking("spa")}>
                          Book Spa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="past">
                <div className="space-y-4">
                  {pastBookings.length > 0 ? (
                    pastBookings.map((booking) => (
                      <Card key={booking.id} className="overflow-hidden opacity-75">
                        <CardContent className="p-0">
                          <div className="flex">
                            <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                              <img
                                src={booking.service?.image_url || "/placeholder.svg"}
                                alt={booking.service?.name || "Service"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-4 flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {getBookingIcon(booking.service?.category || "")}
                                    <h3 className="font-medium">{booking.service?.name || "Service Booking"}</h3>
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{formatDate(booking.booking_date || booking.created_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>{booking.metadata?.time || "Time not specified"}</span>
                                      {booking.metadata?.duration && <span> • {booking.metadata.duration}</span>}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>{booking.service?.location || "Location not specified"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                                    {booking.status === "completed" ? "Completed" : "Canceled"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Past Bookings</h3>
                      <p className="text-gray-500">You don't have any past bookings or reservations.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Quick Actions */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => handleNewBooking("restaurant")}>
                    <Utensils className="mr-2 h-4 w-4" />
                    Book a Restaurant
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => handleNewBooking("spa")}>
                    <Spa className="mr-2 h-4 w-4" />
                    Book a Spa Service
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => handleNewBooking("tour")}>
                    <Ticket className="mr-2 h-4 w-4" />
                    Book an Activity
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  )
}


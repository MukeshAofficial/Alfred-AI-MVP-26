"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Search, Filter, Check, X, Clock, User, MapPin, Phone, Mail, DollarSign, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { BookingsDB, BookingData } from "@/lib/bookings-db"
import { useAuth } from "@/contexts/auth-context"

export default function VendorBookingsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("_all")
  const [dateFilter, setDateFilter] = useState("_all")
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { profile } = useAuth()

  const [bookings, setBookings] = useState<BookingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Only fetch bookings if we have a vendor profile
    if (profile?.id && profile.role === 'vendor') {
      console.log(`Fetching bookings for vendor ${profile.id}`);
      fetchVendorBookings(profile.id)
    } else {
      console.log('No vendor profile available to fetch bookings', { 
        profileId: profile?.id, 
        role: profile?.role 
      });
      setIsLoading(false);
      if (profile?.id && profile.role !== 'vendor') {
        setError("You must have a vendor profile to view bookings")
      }
    }
  }, [profile?.id, profile?.role])

  const fetchVendorBookings = async (vendorId: string) => {
    console.log(`Starting to fetch bookings for vendor: ${vendorId}`);
    setIsLoading(true)
    setError(null)
    try {
      const bookingsDB = new BookingsDB()
      console.log('BookingsDB instance created for vendor bookings');
      const data = await bookingsDB.getVendorBookings(vendorId)
      console.log(`Successfully fetched ${data.length} vendor bookings`);
      setBookings(data)
    } catch (err: any) {
      console.error("Error fetching vendor bookings:", err)
      console.error("Error details:", err.message || "Unknown error");
      if (err.stack) {
        console.error("Stack trace:", err.stack);
      }
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "canceled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "rescheduled":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not scheduled"
    
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return new Date(dateString).toLocaleDateString("en-US", options)
  }

  const updateBookingStatus = async (id: string, newStatus: "confirmed" | "pending" | "canceled" | "completed" | "rescheduled") => {
    try {
      const bookingsDB = new BookingsDB()
      await bookingsDB.updateBookingStatus(id, newStatus)
      
      // Update local state
      setBookings(prevBookings => 
        prevBookings.map(booking => 
          booking.id === id ? { ...booking, status: newStatus as BookingData["status"] } : booking
        )
    )

    toast({
      title: "Booking updated",
        description: `Booking status has been updated to ${newStatus}.`,
    })

    if (selectedBooking?.id === id) {
        setSelectedBooking({ ...selectedBooking, status: newStatus as BookingData["status"] })
      }
    } catch (err: any) {
      console.error("Error updating booking status:", err)
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const viewBookingDetails = (booking: BookingData) => {
    setSelectedBooking(booking)
    setIsDetailsOpen(true)
  }

  // Filter bookings based on search query and filters
  const filteredBookings = bookings.filter((booking) => {
    // Filter by search query
    if (
      searchQuery &&
      !booking.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !booking.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Filter by status
    if (statusFilter && statusFilter !== '_all' && booking.status !== statusFilter) {
      return false
    }

    // Filter by date - compare only the date part to avoid timezone issues
    if (dateFilter && dateFilter !== '_all' && booking.booking_date) {
      const filterDate = new Date(dateFilter).toISOString().split('T')[0];
      const bookingDateStr = new Date(booking.booking_date).toISOString().split('T')[0];
      if (filterDate !== bookingDateStr) {
        return false;
      }
    } else if (dateFilter && dateFilter !== '_all' && !booking.booking_date) {
      return false;
    }

    return true
  })

  // Get unique dates for the date filter - format to YYYY-MM-DD to avoid duplicates
  const uniqueDatesMap = new Map<string, string>();
  
  bookings.forEach(booking => {
    if (booking.booking_date) {
      const dateStr = new Date(booking.booking_date).toISOString().split('T')[0];
      uniqueDatesMap.set(dateStr, booking.booking_date);
    }
  });
  
  const uniqueDates = Array.from(uniqueDatesMap.values());

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your bookings...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-12 text-center">
        <p className="text-red-500 mb-2">Error loading bookings</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" onClick={() => profile?.id && fetchVendorBookings(profile.id)}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Bookings</h1>
            <p className="text-muted-foreground">Manage your service bookings</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => router.push("/vendor/dashboard")}>Dashboard</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings.filter(b => b.status === "confirmed").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings.filter(b => b.status === "pending").length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{bookings.filter(b => b.status === "completed").length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
            <Input
                placeholder="Search by customer, booking ID or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Dates</SelectItem>
                  {uniqueDates
                    .filter(date => !!date) // Filter out null/undefined/empty values
                    .map((date) => (
                    <SelectItem key={date} value={date}>
                        {formatDate(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("_all")
                  setDateFilter("_all")
                }}
              >
                Reset
              </Button>
          </div>
        </div>

          <div className="mt-6">
            <Tabs defaultValue="all" className="w-full" value={statusFilter === "_all" ? "all" : statusFilter} onValueChange={(value) => setStatusFilter(value === "all" ? "_all" : value)}>
              <TabsList>
            <TabsTrigger value="all">All Bookings</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="canceled">Canceled</TabsTrigger>
          </TabsList>
            </Tabs>
                </div>

          <div className="mt-6">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No bookings found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium">{booking.id.substring(0, 8)}</td>
                        <td className="px-4 py-3">{booking.user_name || "Guest"}</td>
                        <td className="px-4 py-3">{booking.service_name}</td>
                        <td className="px-4 py-3">
                          {booking.booking_date ? (
                            <>
                              {formatDate(booking.booking_date)}
                              <br />
                              <span className="text-muted-foreground">{booking.metadata?.time || "Not specified"}</span>
                            </>
                          ) : (
                            "Not scheduled"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {booking.currency || booking.service_currency} {booking.amount_paid?.toFixed(2) || booking.service_price?.toFixed(2)}
                          </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("font-normal", getStatusColor(booking.status))}>
                            {booking.status}
                            </Badge>
                          </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => viewBookingDetails(booking)}>
                            View Details
                                </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>

        {/* Booking Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
              Booking ID: {selectedBooking?.id.substring(0, 8)}
              </DialogDescription>
            </DialogHeader>

            {selectedBooking && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div>
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <User className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedBooking.user_name || "Guest"}</p>
                          <p className="text-sm text-muted-foreground">{selectedBooking.metadata?.room && `Room ${selectedBooking.metadata?.room}`}</p>
                        </div>
                      </div>
                      {selectedBooking.user_email && (
                      <div className="flex items-start">
                          <Mail className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">{selectedBooking.user_email}</p>
                            <p className="text-sm text-muted-foreground">Email</p>
                          </div>
                        </div>
                      )}
                      {selectedBooking.metadata?.phone && (
                      <div className="flex items-start">
                          <Phone className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">{selectedBooking.metadata.phone}</p>
                            <p className="text-sm text-muted-foreground">Phone</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold mt-6 mb-3">Payment Information</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">
                          {selectedBooking.currency || selectedBooking.service_currency} {selectedBooking.amount_paid?.toFixed(2) || selectedBooking.service_price?.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Status</span>
                        <Badge className={cn("font-normal", selectedBooking.payment_status === "paid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                          {selectedBooking.payment_status}
                        </Badge>
                      </div>
                      {selectedBooking.payment_intent && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment ID</span>
                          <span className="font-medium">{selectedBooking.payment_intent.substring(0, 10)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                  </div>

                  <div>
                <h3 className="font-semibold mb-3">Service Information</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                        <div>
                        <p className="font-medium">{selectedBooking.service_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedBooking.service_category}</p>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedBooking.service_location || "Not specified"}</p>
                          <p className="text-sm text-muted-foreground">Location</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="h-5 w-5 mr-2 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedBooking.service_duration || "Not specified"} minutes</p>
                          <p className="text-sm text-muted-foreground">Duration</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <h3 className="font-semibold mt-6 mb-3">Booking Details</h3>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date</span>
                        <span className="font-medium">
                          {selectedBooking.booking_date ? formatDate(selectedBooking.booking_date) : "Not scheduled"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time</span>
                        <span className="font-medium">{selectedBooking.metadata?.time || "Not specified"}</span>
                  </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge className={cn("font-normal", getStatusColor(selectedBooking.status))}>
                          {selectedBooking.status}
                        </Badge>
                </div>
                      {selectedBooking.metadata?.notes && (
                  <div>
                          <p className="text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm">{selectedBooking.metadata.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {(selectedBooking.status === "pending" || selectedBooking.status === "confirmed") && (
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex gap-2">
                    {selectedBooking.status === "pending" && (
                        <Button
                          className="flex-1" 
                          onClick={() => updateBookingStatus(selectedBooking.id, "confirmed")}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                      )}
                        <Button
                        variant="destructive" 
                        className="flex-1" 
                        onClick={() => updateBookingStatus(selectedBooking.id, "canceled")}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                        </Button>
                    </div>
                    {selectedBooking.status === "confirmed" && (
                      <Button
                        variant="outline" 
                        onClick={() => updateBookingStatus(selectedBooking.id, "completed")}
                      >
                        Mark as Completed
                      </Button>
                    )}
                  </div>
                )}
              </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  )
}


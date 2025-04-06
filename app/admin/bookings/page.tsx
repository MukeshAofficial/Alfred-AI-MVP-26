"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  Search,
  Filter,
  Download,
  SpadeIcon as Spa,
  Utensils,
  Compass,
  Car,
  Check,
  X,
  Clock,
  ChevronDown,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { BookingsDB, BookingData } from "@/lib/bookings-db"
import { useAuth } from "@/contexts/auth-context"

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const { toast } = useToast()
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllBookings()
  }, [])

  const fetchAllBookings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const bookingsDB = new BookingsDB()
      const data = await bookingsDB.getAllBookings()
      setBookings(data)
    } catch (err: any) {
      console.error("Error fetching bookings:", err)
      setError(err.message || "Failed to load bookings")
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "spa":
        return <Spa className="h-4 w-4" />
      case "restaurant":
        return <Utensils className="h-4 w-4" />
      case "tour":
        return <Compass className="h-4 w-4" />
      case "transport":
        return <Car className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "canceled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const getPaymentColor = (payment: string) => {
    switch (payment) {
      case "paid":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "unpaid":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      case "failed":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      case "refunded":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const updateBookingStatus = async (id: string, status: 'confirmed' | 'pending' | 'completed' | 'canceled' | 'rescheduled') => {
    try {
      const bookingsDB = new BookingsDB()
      await bookingsDB.updateBookingStatus(id, status)
      
      // Update local state
      setBookings((prev) => 
        prev.map((booking) => (booking.id === id ? { ...booking, status } : booking))
      )

    toast({
      title: "Booking updated",
      description: `Booking ${id} status changed to ${status}`,
    })
    } catch (err: any) {
      console.error("Error updating booking status:", err)
      toast({
        title: "Error updating booking",
        description: err.message || "Failed to update booking status",
        variant: "destructive"
      })
    }
  }

  // Filter bookings based on active tab, search query, and filters
  const filteredBookings = bookings.filter((booking) => {
    // Filter by tab
    if (activeTab !== "all" && booking.service?.category !== activeTab) {
      return false
    }

    // Filter by search query
    if (
      searchQuery &&
      !booking.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !booking.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !booking.id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }

    // Filter by date
    if (dateFilter && booking.booking_date !== dateFilter) {
      return false
    }

    // Filter by status
    if (statusFilter && booking.status !== statusFilter) {
      return false
    }

    return true
  })

  const exportCSV = () => {
    const headers = ["ID", "Service", "Category", "Guest", "Date", "Time", "Status", "Payment", "Notes"]
    let csvContent = headers.join(",") + "\n"

    filteredBookings.forEach((booking) => {
      const row = [
        booking.id,
        booking.service?.name || "",
        booking.service?.category || "",
        booking.user?.full_name || "",
        booking.booking_date || "",
        booking.metadata?.time || "",
        booking.status,
        booking.payment_status,
        booking.metadata?.notes || "",
      ]
      csvContent += row.map(cell => `"${cell}"`).join(",") + "\n"
    })

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `bookings-export-${new Date().toISOString().split("T")[0]}.csv`)
    link.click()
  }

  // Check if user has admin access
  if (!profile || profile.role !== 'admin') {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
            <Button onClick={() => window.location.href = '/'}>
              Return to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading bookings data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500 font-medium mb-2">Error loading bookings</p>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAllBookings}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Bookings Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor all guest bookings and reservations
          </p>
        </div>
        <div className="flex items-center mt-4 sm:mt-0 space-x-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {bookings.length > 0 ? new Date(Math.min(...bookings.map(b => new Date(b.created_at).getTime()))).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(b => b.status === "confirmed").length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((bookings.filter(b => b.status === "confirmed").length / bookings.length) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(b => b.status === "pending").length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((bookings.filter(b => b.status === "pending").length / bookings.length) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.filter(b => b.status === "canceled").length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((bookings.filter(b => b.status === "canceled").length / bookings.length) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
              type="search"
              placeholder="Search bookings..."
              className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="date-filter" className="text-sm font-medium">
                Date Filter
              </label>
              {dateFilter && (
                <Button variant="ghost" size="sm" className="h-6 p-0" onClick={() => setDateFilter("")}>
                  Clear
                </Button>
              )}
                </div>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="status-filter" className="text-sm font-medium block mb-2">
              Status Filter
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="canceled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="spa" className="flex-1">
                Spa
              </TabsTrigger>
              <TabsTrigger value="restaurant" className="flex-1">
                Dining
              </TabsTrigger>
              <TabsTrigger value="tour" className="flex-1">
                Activities
              </TabsTrigger>
            </TabsList>
          </Tabs>
      </div>

        <div className="lg:col-span-5">
        <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>
                  Bookings List
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredBookings.length} entries)
                  </span>
                </CardTitle>
                <Button variant="ghost" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                  <p className="text-muted-foreground">No bookings match your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                        <th className="text-left font-medium p-2">ID</th>
                        <th className="text-left font-medium p-2">Service</th>
                        <th className="text-left font-medium p-2">Guest</th>
                        <th className="text-left font-medium p-2">Date/Time</th>
                        <th className="text-left font-medium p-2">Status</th>
                        <th className="text-left font-medium p-2">Payment</th>
                        <th className="text-right font-medium p-2">Actions</th>
                    </tr>
                  </thead>
                    <tbody className="divide-y">
                    {filteredBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-muted/50">
                          <td className="p-2 whitespace-nowrap">{booking.id.substring(0, 8)}</td>
                          <td className="p-2">
                          <div className="flex items-center">
                              {booking.service?.category && getCategoryIcon(booking.service.category)}
                              <span className={booking.service?.category ? "ml-2" : ""}>
                                {booking.service?.name || "Unknown Service"}
                              </span>
                          </div>
                        </td>
                          <td className="p-2">
                          <div>
                              <div>{booking.user?.full_name || "Guest"}</div>
                              <div className="text-xs text-muted-foreground">
                                {booking.user?.email || "No email"}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div>
                              <div>
                                {booking.booking_date 
                                  ? new Date(booking.booking_date).toLocaleDateString() 
                                  : new Date(booking.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                                {booking.metadata?.time || "Time not specified"}
                              </div>
                          </div>
                        </td>
                          <td className="p-2">
                          <Badge
                              variant="secondary"
                              className={cn("font-normal", getStatusColor(booking.status))}
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </td>
                          <td className="p-2">
                          <Badge
                              variant="secondary"
                              className={cn("font-normal", getPaymentColor(booking.payment_status))}
                          >
                              {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                          </Badge>
                        </td>
                          <td className="p-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <span className="sr-only">Open menu</span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateBookingStatus(booking.id, "confirmed")}
                                  disabled={booking.status === "confirmed"}
                              >
                                  <Check className="mr-2 h-4 w-4" />
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updateBookingStatus(booking.id, "completed")}
                                  disabled={booking.status === "completed"}
                              >
                                  <Check className="mr-2 h-4 w-4" />
                                  Mark as Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  onClick={() => updateBookingStatus(booking.id, "canceled")}
                                  disabled={booking.status === "canceled"}
                              >
                                  <X className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
}


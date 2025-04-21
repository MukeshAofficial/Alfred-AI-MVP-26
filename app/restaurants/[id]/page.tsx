"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Star, Calendar, Utensils, MoreVertical, Clock, Users, DollarSign, Info, ChevronRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { RestaurantDB } from "@/lib/restaurant-db"
import { AdminRestaurant, AdminRestaurantMenuItem, AdminRestaurantTable } from "@/types/restaurant"
import { createRestaurantCheckoutSession } from "@/lib/restaurant-actions"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

export default function RestaurantDetailPage() {
  // Helper to safely access opening hours
  function getOpeningHour(day: string) {
    if (!restaurant || !restaurant.opening_hours) return 'Closed';
    // Handle stringified JSON or object
    let hours = restaurant.opening_hours;
    if (typeof hours === 'string') {
      try {
        hours = JSON.parse(hours);
      } catch {
        return 'Closed';
      }
    }
    if (!hours[day] || typeof hours[day] !== 'object') return 'Closed';
    const start = hours[day].start || '--:--';
    const end = hours[day].end || '--:--';
    return `${start} - ${end}`;
  }
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const { toast } = useToast()
  
  // Get restaurant ID from params safely
  const restaurantId = params.id as string
  
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null)
  const [menuItems, setMenuItems] = useState<AdminRestaurantMenuItem[]>([])
  const [tables, setTables] = useState<AdminRestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  
  // Booking state
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedDate, setSelectedDate] = useState<Date>(getTomorrowDate())
  const [partySize, setPartySize] = useState(2)
  const [specialRequests, setSpecialRequests] = useState("")
  const [isBooking, setIsBooking] = useState(false)

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails(restaurantId)
    }
  }, [restaurantId])
  
  function getTomorrowDate() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  }

  const fetchRestaurantDetails = async (id: string) => {
    setLoading(true)
    setError(false)
    
    try {
      const restaurantDb = RestaurantDB.getInstance()
      
      // Get restaurant details
      const restaurantData = await restaurantDb.getRestaurantById(id)
      
      if (!restaurantData) {
        setError(true)
        setLoading(false)
        return
      }
      
      setRestaurant(restaurantData)
      
      // Get menu items
      const menuItemsData = await restaurantDb.getRestaurantMenuItemsByRestaurantId(id)
      setMenuItems(menuItemsData)
      
      // Get tables
      const tablesData = await restaurantDb.getRestaurantTablesByRestaurantId(id)
      setTables(tablesData)
    } catch (error) {
      console.error('Error fetching restaurant details:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  
  const handleBooking = async () => {
    if (!restaurant) return
    
    if (!profile || !profile.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to make a reservation.",
        variant: "destructive",
      })
      return
    }
    
    setIsBooking(true)
    
    try {
      // Format date to YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0]
      
      // Create a checkout session
      const result = await createRestaurantCheckoutSession({
        restaurantId: restaurant.id,
        bookingDate: formattedDate,
        partySize: partySize,
        userId: profile.id,
        specialRequests: specialRequests,
      })
      
      if (result?.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl
      } else {
        throw new Error("Could not create checkout session")
      }
    } catch (error) {
      console.error("Reservation error:", error)
      toast({
        title: "Reservation Error",
        description: "There was a problem processing your reservation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
    }
  }
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }
  
  // Group menu items by category
  const menuByCategory = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, AdminRestaurantMenuItem[]>)
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Restaurant" />
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-full"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Restaurant Not Found" />
        <div className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Restaurant Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find the restaurant you're looking for. Please try again later.
            </p>
            <Button onClick={() => router.push("/restaurants")}>Browse Restaurants</Button>
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={restaurant.name} />

      <div className="container mx-auto px-4 py-6 flex-1 pb-20">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Restaurant Details */}
          <div className="w-full md:w-2/3">
            <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mb-4">
              <Badge>{restaurant.cuisine_type}</Badge>
              <Badge variant="outline">{restaurant.price_range}</Badge>
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span>{(4 + Math.random()).toFixed(1)}</span>
              </div>
            </div>

            <div className="relative h-80 mb-6 rounded-lg overflow-hidden">
              <img
                src={restaurant.images && restaurant.images.length > 0 ? restaurant.images[0] : "/placeholder.svg"}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="menu">Menu</TabsTrigger>
                <TabsTrigger value="booking">Reservations</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview">
                <p className="text-gray-700 mb-6">{restaurant.description}</p>

                <div className="flex space-x-4 mb-6">
                  <Button
                    onClick={() => setActiveTab("menu")}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Menu className="mr-2 h-4 w-4" />
                    View Menu
                  </Button>
                  
                  <Button
                    onClick={() => setActiveTab("booking")}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Make a Reservation
                  </Button>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Opening Hours</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Weekdays</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{getOpeningHour('monday')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Saturdays</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{getOpeningHour('saturday')}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Sundays</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{getOpeningHour('sunday')}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Location</h2>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                    <p>{restaurant.location}</p>
                  </div>
                </div>
              </TabsContent>
              
              {/* Menu Tab */}
              <TabsContent value="menu">
                <h2 className="text-2xl font-bold mb-6">Our Menu</h2>
                
                {Object.keys(menuByCategory).length === 0 ? (
                  <p className="text-gray-500">Menu items for this restaurant are not available.</p>
                ) : (
                  <div className="space-y-8">
                    {Object.keys(menuByCategory).map((category) => (
                      <div key={category} className="space-y-4">
                        <h3 className="text-xl font-semibold border-b pb-2">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {menuByCategory[category].map((item) => (
                            <Card key={item.id} className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold text-lg">{item.name}</h4>
                                  <span className="font-bold text-primary">{formatPrice(item.price)}</span>
                                </div>
                                <p className="text-gray-600 mt-1 text-sm">{item.description}</p>
                                {item.dietary_info && item.dietary_info.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {item.dietary_info.map((info) => (
                                      <Badge key={info} variant="outline" className="text-xs">
                                        {info}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-12 bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
                  <h3 className="text-xl font-semibold mb-2">Ready to enjoy our delicious food?</h3>
                  <p className="text-gray-600 mb-4">Reserve your table now to experience our culinary delights.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button 
                      onClick={() => router.push(`/restaurants/${restaurantId}/menu`)}
                      size="lg"
                      variant="outline"
                    >
                      <Utensils className="mr-2 h-4 w-4" />
                      View Full Menu
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("booking")}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Make a Reservation
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* Booking Tab */}
              <TabsContent value="booking">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Make a Reservation</h2>
                      <p className="text-gray-600 mb-6">
                        Select your preferred date, time, and party size to reserve a table at {restaurant?.name}.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">1. Choose Date & Time</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="date" className="block text-sm font-medium mb-2">
                              Date
                            </Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : "Select date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => setSelectedDate(date)}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label htmlFor="time" className="block text-sm font-medium mb-2">
                              Time
                            </Label>
                            <Select value={selectedDate?.toISOString().split('T')[1].split(':')[0]} onValueChange={(value) => setSelectedDate(new Date(selectedDate.toISOString().split('T')[0] + 'T' + value + ':00'))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
                                  <SelectItem key={hour} value={hour.toString()}>
                                    {hour}:00
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">2. Party Details</h3>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="partySize" className="block text-sm font-medium mb-2">
                              Number of Guests
                            </Label>
                            <Select value={partySize.toString()} onValueChange={(value) => setPartySize(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select party size" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((size) => (
                                  <SelectItem key={size} value={size.toString()}>
                                    {size} {size === 1 ? "person" : "people"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="specialRequests" className="block text-sm font-medium mb-2">
                              Special Requests (Optional)
                            </Label>
                            <Textarea
                              placeholder="Any dietary restrictions or special occasions?"
                              value={specialRequests}
                              onChange={(e) => setSpecialRequests(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-primary/5 p-6 rounded-lg border border-gray-200 shadow-sm sticky top-4">
                      <h3 className="text-lg font-semibold mb-4">Reservation Summary</h3>
                      
                      {!selectedDate ? (
                        <p className="text-gray-500 italic">Please complete your reservation details</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-600">Restaurant:</span>
                            <span className="font-medium">{restaurant?.name}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium">{selectedDate ? format(selectedDate, "PPP") : "Not selected"}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-600">Time:</span>
                            <span className="font-medium">{selectedDate?.toISOString().split('T')[1].split(':')[0]}:00</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-600">Party Size:</span>
                            <span className="font-medium">{partySize} {partySize === 1 ? "person" : "people"}</span>
                          </div>
                          <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <span className="text-gray-600">Reservation Fee:</span>
                            <span className="font-medium text-primary">{formatPrice(Math.max(10 * partySize, 20))}</span>
                          </div>
                          <p className="text-sm text-gray-500 italic">
                            Reservation fee will be deducted from your final bill.
                          </p>
                        </div>
                      )}
                      
                      <Button
                        className="w-full mt-6"
                        size="lg"
                        disabled={!selectedDate || !partySize}
                        onClick={handleBooking}
                      >
                        {isBooking ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Confirm Reservation"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="w-full md:w-1/3">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Quick Reservation</CardTitle>
                <CardDescription>Book your table at {restaurant.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                      </div>
                      <input 
                        type="date" 
                        id="date" 
                        className="w-full pl-10 py-2 border rounded-md"
                        min={new Date().toISOString().split('T')[0]}
                        value={selectedDate.toISOString().split('T')[0]}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                      Time
                    </label>
                    <select id="time" className="w-full py-2 border rounded-md">
                      <option value="19:00">7:00 PM</option>
                      <option value="19:30">7:30 PM</option>
                      <option value="20:00">8:00 PM</option>
                      <option value="20:30">8:30 PM</option>
                      <option value="21:00">9:00 PM</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Guests
                    </label>
                    <select 
                      id="guests" 
                      className="w-full py-2 border rounded-md"
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Person' : 'People'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => setActiveTab("booking")}
                >
                  Complete Reservation
                </Button>
              </CardFooter>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Special Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
                    <h4 className="font-medium text-purple-800">Happy Hour</h4>
                    <p className="text-sm text-purple-700">Enjoy 20% off all drinks from 5PM to 7PM daily.</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <h4 className="font-medium text-blue-800">Weekend Brunch</h4>
                    <p className="text-sm text-blue-700">Special brunch menu available on weekends from 10AM to 2PM.</p>
                  </div>
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


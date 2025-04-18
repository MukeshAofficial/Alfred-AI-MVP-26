"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Filter, MapPin, Star, Clock, DollarSign, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { RestaurantDB } from "@/lib/restaurant-db"
import { AdminRestaurant } from "@/types/restaurant"

export default function RestaurantsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [cuisineFilter, setCuisineFilter] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [dbSetupError, setDbSetupError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchRestaurants()
    
    // Check for canceled payment
    const canceled = searchParams.get('canceled')
    if (canceled) {
      console.log('Payment was canceled')
    }
  }, [])
  
  const fetchRestaurants = async () => {
    setLoading(true)
    setDbSetupError(null)
    try {
      const restaurantDB = RestaurantDB.getInstance()
      
      // Check if tables exist first
      const tablesExist = await restaurantDB.checkTablesExist();
      if (!tablesExist.restaurantsExist) {
        setDbSetupError("Restaurant database tables do not exist. The system needs to be initialized.");
        setLoading(false);
        return;
      }
      
      // If tables exist, fetch restaurants
      const restaurantsData = await restaurantDB.getAllRestaurants()
      
      // Filter only active restaurants
      const activeRestaurants = restaurantsData.filter(restaurant => restaurant.status === 'active')
      setRestaurants(activeRestaurants)
    } catch (error) {
      console.error("Failed to fetch restaurants:", error)
      let errorMessage = "Failed to load restaurants. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setDbSetupError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Filter restaurants based on search query, cuisine, and price
  const filteredRestaurants = restaurants.filter((restaurant) => {
    // Filter by search query
    const matchesSearch =
      restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by cuisine type
    const matchesCuisine = 
      cuisineFilter === "all" || 
      restaurant.cuisine_type.toLowerCase() === cuisineFilter.toLowerCase()

    // Filter by price range
    const matchesPrice = 
      priceFilter === "all" || 
      restaurant.price_range === priceFilter

    return matchesSearch && matchesCuisine && matchesPrice
  })

  // Get unique cuisine types from all restaurants
  const cuisineTypes = ["all", ...new Set(restaurants.map(r => r.cuisine_type.toLowerCase()))]
  
  // Get unique price ranges from all restaurants
  const priceRanges = ["all", ...new Set(restaurants.map(r => r.price_range))]

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Restaurants" />

      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Restaurants</h1>
          <p className="text-gray-600">Discover and book our fine dining experiences</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search restaurants..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select 
                className="border rounded px-3 py-2 bg-white text-sm"
                value={cuisineFilter}
                onChange={(e) => setCuisineFilter(e.target.value)}
              >
                <option value="all">All Cuisines</option>
                {cuisineTypes
                  .filter(c => c !== "all")
                  .map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                    </option>
                  ))}
              </select>
              
              <select 
                className="border rounded px-3 py-2 bg-white text-sm"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">All Prices</option>
                {priceRanges
                  .filter(p => p !== "all")
                  .sort((a, b) => a.length - b.length)
                  .map((price) => (
                    <option key={price} value={price}>
                      {price}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
        
        {dbSetupError && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-6">
            <AlertTitle>Database Setup Required</AlertTitle>
            <AlertDescription>
              {dbSetupError}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Skeleton loading state for restaurants
            [...Array(6)].map((_, i) => (
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
          ) : filteredRestaurants.length > 0 ? (
            filteredRestaurants.map((restaurant) => (
              <Card
                key={restaurant.id}
                className="overflow-hidden cursor-pointer hover:shadow-md"
                onClick={() => router.push(`/restaurants/${restaurant.id}`)}
              >
                <div className="h-40 relative">
                  <img
                    src={restaurant.images && restaurant.images.length > 0 ? restaurant.images[0] : "/placeholder.svg"}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-2 right-2 bg-white text-black hover:bg-white">
                    {restaurant.price_range}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-lg">{restaurant.name}</h3>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span>{(4 + Math.random()).toFixed(1)}</span>
                    </div>
                  </div>
                  <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {restaurant.cuisine_type}
                  </Badge>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{restaurant.description}</p>
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{restaurant.location}</span>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      Opens: {restaurant.opening_hours.monday.start} - {restaurant.opening_hours.monday.end}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 border-t flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {restaurant.capacity ? `Capacity: ${restaurant.capacity}` : 'Tables available'}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/restaurants/${restaurant.id}/menu`);
                    }}>
                      View Menu
                    </Button>
                    <Button size="sm">View Details</Button>
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">No restaurants found matching your criteria.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setCuisineFilter("all")
                  setPriceFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Navigation />
    </div>
  )
}


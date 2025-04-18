"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, Utensils, Wine, IceCream, Coffee, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { RestaurantDB } from "@/lib/restaurant-db"
import { AdminRestaurant, AdminRestaurantMenuItem } from "@/types/restaurant"

export default function RestaurantMenuPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as any) as { id: string }
  const restaurantId = unwrappedParams.id
  
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null)
  const [menuItems, setMenuItems] = useState<AdminRestaurantMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("all")
  
  useEffect(() => {
    fetchRestaurantAndMenuItems()
  }, [restaurantId])
  
  const fetchRestaurantAndMenuItems = async () => {
    setLoading(true)
    try {
      const restaurantDb = RestaurantDB.getInstance()
      
      // Get restaurant details
      const restaurantData = await restaurantDb.getRestaurantById(restaurantId)
      if (!restaurantData) {
        setError(true)
        setLoading(false)
        return
      }
      
      setRestaurant(restaurantData)
      
      // Get menu items
      const menuItemsData = await restaurantDb.getRestaurantMenuItemsByRestaurantId(restaurantId)
      
      // Only show available items to customers
      const availableItems = menuItemsData.filter(item => item.is_available)
      setMenuItems(availableItems)
    } catch (error) {
      console.error('Error fetching restaurant menu:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  
  // Filter menu items based on search query and active category
  const filterMenuItems = (items: AdminRestaurantMenuItem[]) => {
    if (!items) return []
    
    let filtered = items
    
    // Apply category filter if not "all"
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.category === activeCategory)
    }
    
    // Apply search filter if search query exists
    if (searchQuery) {
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.dietary_info && item.dietary_info.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      )
    }
    
    return filtered
  }
  
  // Get all unique categories from menu items
  const getCategories = () => {
    if (!menuItems.length) return ["all"]
    const categorySet = new Set(menuItems.map(item => item.category))
    return ["all", ...Array.from(categorySet)]
  }
  
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'starters':
        return <Utensils className="h-4 w-4 mr-2" />
      case 'mains':
        return <Utensils className="h-4 w-4 mr-2" />
      case 'desserts':
        return <IceCream className="h-4 w-4 mr-2" />
      case 'drinks':
        return <Wine className="h-4 w-4 mr-2" />
      case 'specials':
        return <Star className="h-4 w-4 mr-2" />
      default:
        return <Coffee className="h-4 w-4 mr-2" />
    }
  }
  
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }
  
  const filteredMenuItems = filterMenuItems(menuItems)
  const categories = getCategories()
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Restaurant Menu" />
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
        <Header title="Restaurant Menu" />
        <div className="container mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Menu Not Found</h2>
            <p className="text-gray-600 mb-6">We couldn't find the menu you're looking for. Please try again later.</p>
            <Button onClick={() => router.push("/restaurants")}>Browse Restaurants</Button>
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={`${restaurant.name} - Menu`} />

      <div className="container mx-auto px-4 py-6 flex-1 pb-20">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/restaurants/${restaurantId}`)} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Restaurant
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">{restaurant.name} Menu</h1>
          <div className="flex flex-wrap items-center text-sm text-gray-500 mb-6">
            <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
              {restaurant.cuisine_type}
            </Badge>
            <Badge variant="outline" className="mr-2">
              {restaurant.price_range}
            </Badge>
            <span>{restaurant.location}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search menu..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="mb-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="flex items-center capitalize">
                {category !== "all" && getCategoryIcon(category)}
                {category === "all" ? "All Items" : category}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="space-y-4">
            {filteredMenuItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenuItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col">
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg">{item.name}</h3>
                              {item.is_featured && (
                                <Badge className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-100">Featured</Badge>
                              )}
                            </div>
                            <span className="font-medium text-lg">{formatPrice(item.price, item.currency)}</span>
                          </div>
                          <p className="text-gray-600 mt-2 mb-3">{item.description}</p>
                          
                          {item.dietary_info && item.dietary_info.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {item.dietary_info.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No items found matching your search.</p>
                {searchQuery && (
                  <Button variant="outline" className="mt-4" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Navigation />
    </div>
  )
}


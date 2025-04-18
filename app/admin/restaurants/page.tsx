"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Edit, MoreHorizontal, AlertTriangle, Loader2, Database, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { RestaurantDB } from "@/lib/restaurant-db"
import { AdminRestaurant } from "@/types/restaurant"

export default function AdminRestaurantsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDbSetupDialog, setShowDbSetupDialog] = useState(false)
  const [isSettingUpDb, setIsSettingUpDb] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState<AdminRestaurant | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  
  useEffect(() => {
    fetchRestaurants()
  }, [])
  
  const fetchRestaurants = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Safely create RestaurantDB instance
      let restaurantDb;
      try {
        restaurantDb = RestaurantDB.getInstance();
      } catch (initError) {
        console.error("Failed to initialize RestaurantDB:", initError);
        setError("Database connection failed. Please check your environment configuration.");
        setLoading(false);
        return;
      }
      
      // Check if tables exist
      try {
        const tablesExist = await restaurantDb.checkTablesExist();
        if (!tablesExist.restaurantsExist) {
          setShowDbSetupDialog(true);
          setError("Restaurant database tables do not exist. The system needs to be initialized.");
          setLoading(false);
          return;
        }
      } catch (checkError) {
        console.error("Database check error:", checkError);
        const errorMessage = checkError instanceof Error 
          ? checkError.message 
          : "Failed to check database tables";
        setError(`Database error: ${errorMessage}`);
        setShowDbSetupDialog(true);
        setLoading(false);
        return;
      }
      
      // If tables exist, fetch restaurants
      const restaurantsData = await restaurantDb.getAllRestaurants()
      setRestaurants(restaurantsData)
    } catch (error) {
      console.error('Error fetching restaurants:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }
  
  const setupDatabase = async () => {
    setIsSettingUpDb(true)
    
    try {
      const restaurantDb = RestaurantDB.getInstance()
      const result = await restaurantDb.runSetupScripts()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Restaurant database tables have been created successfully.",
        })
        
        setShowDbSetupDialog(false)
        setError(null)
        fetchRestaurants()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error setting up database:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSettingUpDb(false)
    }
  }
  
  const handleDeleteRestaurant = async () => {
    if (!restaurantToDelete) return
    
    try {
      const restaurantDb = RestaurantDB.getInstance()
      await restaurantDb.deleteRestaurant(restaurantToDelete.id)
      
      toast({
        title: "Success",
        description: `Restaurant "${restaurantToDelete.name}" has been deleted.`,
      })
      
      setRestaurantToDelete(null)
      fetchRestaurants()
    } catch (error) {
      console.error('Error deleting restaurant:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete restaurant",
        variant: "destructive",
      })
    }
  }
  
  const openDeleteDialog = (restaurant: AdminRestaurant) => {
    setRestaurantToDelete(restaurant)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
      case 'maintenance':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }
  
  // Filter restaurants by search query
  const filteredRestaurants = restaurants.filter(restaurant => 
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    restaurant.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const initSampleMenuData = async () => {
    setIsSettingUp(true)
    
    try {
      const restaurantDb = RestaurantDB.getInstance()
      const result = await restaurantDb.initSampleMenuData()
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Sample menu data has been added successfully.",
        })
        
        setShowDbSetupDialog(false)
        setError(null)
        fetchRestaurants()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error initializing sample menu data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSettingUp(false)
    }
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-gray-500">Manage restaurant listings and reservations</p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setupDatabase()}>
            {isSettingUp ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Up...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Setup Database
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => initSampleMenuData()}>
            <Utensils className="mr-2 h-4 w-4" />
            Add Sample Menu Data
          </Button>
          <Button onClick={() => router.push("/admin/restaurants/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-6">
        <CardHeader className="p-4">
          <CardTitle>Manage Restaurants</CardTitle>
          <CardDescription>
            View and manage all restaurants available in your system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="mb-4">
            <Input
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Cuisine</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      Loading restaurants...
                    </TableCell>
                  </TableRow>
                ) : filteredRestaurants.length > 0 ? (
                  filteredRestaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell>{restaurant.cuisine_type}</TableCell>
                      <TableCell>{restaurant.location}</TableCell>
                      <TableCell>{restaurant.price_range}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(restaurant.status)}>
                          {restaurant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/restaurants/${restaurant.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/restaurants/${restaurant.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => openDeleteDialog(restaurant)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">
                      No restaurants found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Database Setup Dialog */}
      <Dialog open={showDbSetupDialog} onOpenChange={setShowDbSetupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Database Setup Required</DialogTitle>
            <DialogDescription>
              The restaurant database tables don't exist yet. Would you like to set them up now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDbSetupDialog(false)} disabled={isSettingUpDb}>
              Cancel
            </Button>
            <Button onClick={setupDatabase} disabled={isSettingUpDb}>
              {isSettingUpDb ? "Setting Up..." : "Set Up Database"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!restaurantToDelete} onOpenChange={(open) => !open && setRestaurantToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete restaurant "{restaurantToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestaurantToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRestaurant}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
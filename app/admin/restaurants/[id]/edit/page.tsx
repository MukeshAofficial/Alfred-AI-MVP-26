"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { EnhancedRestaurantForm } from "../../enhanced-form"
import { RestaurantDB } from "@/lib/restaurant-db"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default function EditRestaurantPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Unwrap params
  const unwrappedParams = React.use(params)
  const restaurantId = unwrappedParams.id
  
  useEffect(() => {
    const fetchRestaurant = async () => {
      setLoading(true)
      try {
        const restaurantDb = RestaurantDB.getInstance()
        const restaurantData = await restaurantDb.getRestaurantById(restaurantId)
        
        if (!restaurantData) {
          throw new Error("Restaurant not found")
        }
        
        setRestaurant(restaurantData)
      } catch (err) {
        console.error("Error fetching restaurant:", err)
        setError(err instanceof Error ? err.message : "Failed to load restaurant data")
        
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load restaurant data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchRestaurant()
  }, [restaurantId, toast])
  
  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "Restaurant has been updated successfully",
    })
    router.push("/admin/restaurants")
  }
  
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/restaurants")}
            className="mb-4"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Restaurants
          </Button>
          
          <h1 className="text-3xl font-bold">Edit Restaurant</h1>
          <p className="text-gray-500">Update restaurant information</p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        ) : (
          <EnhancedRestaurantForm 
            initialData={restaurant} 
            restaurantId={restaurantId} 
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  )
} 
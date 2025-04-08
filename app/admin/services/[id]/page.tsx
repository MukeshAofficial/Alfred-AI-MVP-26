"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Clock, MapPin, Users } from "lucide-react"

interface Restaurant {
  id: string
  service_id: string
  capacity: number
  opening_hours: {
    breakfast: { start: string, end: string }
    lunch: { start: string, end: string }
    dinner: { start: string, end: string }
  }
}

interface Service {
  id: string
  name: string
  description: string
  category: string
  location: string
  status: string
  restaurant?: Restaurant
}

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const [service, setService] = useState<Service | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<Service>>({})
  const [restaurantData, setRestaurantData] = useState<Partial<Restaurant>>({})
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchService = async () => {
      // Fetch service data
      const { data: serviceData, error: serviceError } = await supabase
        .from('admin_services')
        .select('*')
        .eq('id', params.id)
        .single()

      if (serviceError) {
        console.error('Error fetching service:', serviceError)
        toast.error('Failed to load service details')
        return
      }

      // Fetch restaurant data if it exists
      let restaurantData = null
      if (serviceData.category === 'restaurant') {
        const { data: restData, error: restError } = await supabase
          .from('admin_restaurants')
          .select('*')
          .eq('service_id', params.id)
          .single()

        if (!restError) {
          restaurantData = restData
        }
      }

      const fullService = {
        ...serviceData,
        restaurant: restaurantData
      }

      setService(fullService)
      setFormData(serviceData)
      if (restaurantData) {
        setRestaurantData(restaurantData)
      }
    }

    fetchService()
  }, [params.id, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRestaurantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'capacity') {
      setRestaurantData(prev => ({
        ...prev,
        capacity: parseInt(value)
      }))
    } else {
      // Handle opening hours in format of "opening_hours.breakfast.start"
      const parts = name.split('.')
      if (parts.length === 3) {
        const [_, mealTime, timeType] = parts
        
        setRestaurantData(prev => {
          const current = prev.opening_hours || service?.restaurant?.opening_hours || {
            breakfast: { start: '', end: '' },
            lunch: { start: '', end: '' },
            dinner: { start: '', end: '' }
          }
          
          return {
            ...prev,
            opening_hours: {
              ...current,
              [mealTime]: {
                ...current[mealTime as keyof typeof current],
                [timeType]: value
              }
            }
          }
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Update the service data
      const { error: serviceError } = await supabase
        .from('admin_services')
        .update(formData)
        .eq('id', params.id)

      if (serviceError) throw serviceError

      // If it's a restaurant, update restaurant data
      if (service?.category === 'restaurant' && service?.restaurant?.id) {
        const { error: restaurantError } = await supabase
          .from('admin_restaurants')
          .update(restaurantData)
          .eq('id', service.restaurant.id)

        if (restaurantError) throw restaurantError
      }

      toast.success('Service updated successfully')
      setIsEditing(false)
      
      // Refresh the service data
      const { data: updatedService } = await supabase
        .from('admin_services')
        .select('*')
        .eq('id', params.id)
        .single()
        
      let updatedRestaurantData = null
      if (updatedService.category === 'restaurant') {
        const { data: restData } = await supabase
          .from('admin_restaurants')
          .select('*')
          .eq('service_id', params.id)
          .single()
          
        updatedRestaurantData = restData
      }
      
      setService({
        ...updatedService,
        restaurant: updatedRestaurantData
      })
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('Failed to update service')
    }
  }

  if (!service) {
    return <div className="container py-8 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading service details...</p>
      </div>
    </div>
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Service Details</h1>
        <div className="space-x-4">
          <Button variant="outline" onClick={() => router.push('/admin/services')}>
            Back to Services
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel' : 'Edit Service'}
          </Button>
          {isEditing && (
            <Button onClick={handleSubmit}>Save Changes</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="spa">Spa</SelectItem>
                    <SelectItem value="gym">Gym</SelectItem>
                    <SelectItem value="pool">Pool</SelectItem>
                    <SelectItem value="concierge">Concierge</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Category cannot be changed after creation</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {service.restaurant && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Restaurant Details</h3>
                  
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      name="capacity"
                      value={restaurantData.capacity || service.restaurant.capacity}
                      onChange={handleRestaurantInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Opening Hours</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Breakfast</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="time"
                            name="opening_hours.breakfast.start"
                            value={
                              restaurantData.opening_hours?.breakfast?.start || 
                              service.restaurant.opening_hours.breakfast.start
                            }
                            onChange={handleRestaurantInputChange}
                          />
                          <Input
                            type="time"
                            name="opening_hours.breakfast.end"
                            value={
                              restaurantData.opening_hours?.breakfast?.end || 
                              service.restaurant.opening_hours.breakfast.end
                            }
                            onChange={handleRestaurantInputChange}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Lunch</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="time"
                            name="opening_hours.lunch.start"
                            value={
                              restaurantData.opening_hours?.lunch?.start || 
                              service.restaurant.opening_hours.lunch.start
                            }
                            onChange={handleRestaurantInputChange}
                          />
                          <Input
                            type="time"
                            name="opening_hours.lunch.end"
                            value={
                              restaurantData.opening_hours?.lunch?.end || 
                              service.restaurant.opening_hours.lunch.end
                            }
                            onChange={handleRestaurantInputChange}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Dinner</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="time"
                            name="opening_hours.dinner.start"
                            value={
                              restaurantData.opening_hours?.dinner?.start || 
                              service.restaurant.opening_hours.dinner.start
                            }
                            onChange={handleRestaurantInputChange}
                          />
                          <Input
                            type="time"
                            name="opening_hours.dinner.end"
                            value={
                              restaurantData.opening_hours?.dinner?.end || 
                              service.restaurant.opening_hours.dinner.end
                            }
                            onChange={handleRestaurantInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-gray-500">{service.description}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{service.location}</span>
                </div>

                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                </div>

                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                  bg-green-100 text-green-800">
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </div>

                {service.restaurant && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium mb-2">Restaurant Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Capacity: {service.restaurant.capacity} people</span>
                      </div>

                      <div className="flex items-start">
                        <Clock className="h-4 w-4 mr-2 mt-1 text-gray-500" />
                        <div>
                          <div className="mb-1">
                            <span className="font-medium">Breakfast:</span> {service.restaurant.opening_hours.breakfast.start} - {service.restaurant.opening_hours.breakfast.end}
                          </div>
                          <div className="mb-1">
                            <span className="font-medium">Lunch:</span> {service.restaurant.opening_hours.lunch.start} - {service.restaurant.opening_hours.lunch.end}
                          </div>
                          <div>
                            <span className="font-medium">Dinner:</span> {service.restaurant.opening_hours.dinner.start} - {service.restaurant.opening_hours.dinner.end}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


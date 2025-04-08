// app/admin/services/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface RestaurantData {
  capacity: number
  opening_hours: {
    breakfast: { start: string, end: string }
    lunch: { start: string, end: string }
    dinner: { start: string, end: string }
  }
}

interface ServiceFormData {
  name: string
  description: string
  category: string
  location: string
  status: string
}

export default function NewServicePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [serviceData, setServiceData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: '',
    location: '',
    status: 'active',
  })
  
  const [restaurantData, setRestaurantData] = useState<RestaurantData>({
    capacity: 0,
    opening_hours: {
      breakfast: { start: '07:00', end: '10:00' },
      lunch: { start: '12:00', end: '14:00' },
      dinner: { start: '18:00', end: '22:00' }
    }
  })

  const handleServiceInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setServiceData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRestaurantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    if (name === 'capacity') {
      setRestaurantData(prev => ({
        ...prev,
        capacity: parseInt(value) || 0
      }))
    } else {
      // Handle opening hours in format of "opening_hours.breakfast.start"
      const parts = name.split('.')
      if (parts.length === 3) {
        const [_, mealTime, timeType] = parts
        
        setRestaurantData(prev => ({
          ...prev,
          opening_hours: {
            ...prev.opening_hours,
            [mealTime]: {
              ...prev.opening_hours[mealTime as keyof typeof prev.opening_hours],
              [timeType]: value
            }
          }
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 1. Insert the service first
      const { data: serviceResult, error: serviceError } = await supabase
        .from('admin_services')
        .insert({
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category,
          location: serviceData.location,
          status: serviceData.status
        })
        .select()
        .single()

      if (serviceError) throw serviceError

      // 2. If it's a restaurant service, insert restaurant details
      if (serviceData.category === 'restaurant') {
        const { error: restaurantError } = await supabase
          .from('admin_restaurants')
          .insert({
            service_id: serviceResult.id,
            capacity: restaurantData.capacity,
            opening_hours: restaurantData.opening_hours
          })

        if (restaurantError) throw restaurantError
      }

      toast.success('Service created successfully')
      router.push('/admin/services')
    } catch (error) {
      console.error('Error creating service:', error)
      toast.error('Failed to create service')
    }
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Service</h1>
        <Button variant="outline" onClick={() => router.push('/admin/services')}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                name="name"
                value={serviceData.name}
                onChange={handleServiceInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={serviceData.description}
                onChange={handleServiceInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={serviceData.category}
                onValueChange={(value) => setServiceData(prev => ({ ...prev, category: value }))}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={serviceData.location}
                onChange={handleServiceInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={serviceData.status}
                onValueChange={(value) => setServiceData(prev => ({ ...prev, status: value }))}
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

            {serviceData.category === 'restaurant' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Restaurant Details</h3>
                
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    name="capacity"
                    value={restaurantData.capacity}
                    onChange={handleRestaurantInputChange}
                    required
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
                          value={restaurantData.opening_hours.breakfast.start}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                        <Input
                          type="time"
                          name="opening_hours.breakfast.end"
                          value={restaurantData.opening_hours.breakfast.end}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Lunch</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="time"
                          name="opening_hours.lunch.start"
                          value={restaurantData.opening_hours.lunch.start}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                        <Input
                          type="time"
                          name="opening_hours.lunch.end"
                          value={restaurantData.opening_hours.lunch.end}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Dinner</Label>
                      <div className="flex space-x-2">
                        <Input
                          type="time"
                          name="opening_hours.dinner.start"
                          value={restaurantData.opening_hours.dinner.start}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                        <Input
                          type="time"
                          name="opening_hours.dinner.end"
                          value={restaurantData.opening_hours.dinner.end}
                          onChange={handleRestaurantInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit">Create Service</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchServices = async () => {
      // Fetch all services
      const { data: servicesData, error: servicesError } = await supabase
        .from('admin_services')
        .select('*')
        .order('created_at', { ascending: false })

      if (servicesError) {
        console.error('Error fetching services:', servicesError)
        return
      }

      // Fetch all restaurant data
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('admin_restaurants')
        .select('*')

      if (restaurantsError) {
        console.error('Error fetching restaurants:', restaurantsError)
        return
      }

      // Combine service data with restaurant data
      const servicesWithRestaurants = servicesData.map(service => {
        const restaurant = restaurantsData.find(r => r.service_id === service.id)
        return {
          ...service,
          restaurant: restaurant || undefined
        }
      })

      setServices(servicesWithRestaurants)
    }

    fetchServices()
  }, [supabase])

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Services</h1>
        <Button onClick={() => router.push('/admin/services/new')}>
          Add New Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card key={service.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => router.push(`/admin/services/${service.id}`)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{service.name}</CardTitle>
                <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                  {service.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{service.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{service.location}</span>
                </div>

                {service.restaurant && (
                  <>
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-500" />
                      <span>Capacity: {service.restaurant.capacity} people</span>
                    </div>

                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <div>
                        <div>Breakfast: {service.restaurant.opening_hours.breakfast.start} - {service.restaurant.opening_hours.breakfast.end}</div>
                        <div>Lunch: {service.restaurant.opening_hours.lunch.start} - {service.restaurant.opening_hours.lunch.end}</div>
                        <div>Dinner: {service.restaurant.opening_hours.dinner.start} - {service.restaurant.opening_hours.dinner.end}</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 
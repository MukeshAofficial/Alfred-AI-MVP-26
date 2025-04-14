"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, Calendar, Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { SpaDB } from "@/lib/spa-db"
import { AdminSpaService } from "@/types/spa"

export default function BookingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [service, setService] = useState<AdminSpaService | null>(null)
  const [loading, setLoading] = useState(true)
  
  const serviceId = searchParams.get('serviceId')
  const bookingDate = searchParams.get('bookingDate')
  
  useEffect(() => {
    if (serviceId) {
      fetchServiceDetails(serviceId)
    } else {
      setLoading(false)
    }
  }, [serviceId])
  
  const fetchServiceDetails = async (id: string) => {
    try {
      const spaDb = SpaDB.getInstance()
      const serviceData = await spaDb.getSpaServiceById(id)
      setService(serviceData)
    } catch (error) {
      console.error("Failed to fetch service details:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date not provided"
    
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Booking Confirmed" />
      
      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-2"
          onClick={() => router.push("/spa-services")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Spa Services
        </Button>
        
        <div className="max-w-md mx-auto text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600">
            Your spa appointment has been successfully booked and confirmed.
          </p>
        </div>
        
        <Card className="max-w-md mx-auto mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">Booking Details</h2>
            
            {loading ? (
              <p className="text-center py-4">Loading booking details...</p>
            ) : service ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Service</p>
                  <p className="text-gray-600">{service.name}</p>
                </div>
                
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-gray-600">{service.spa?.name} - {service.spa?.location}</p>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Date</p>
                    <p className="text-gray-600">{formatDate(bookingDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Clock className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-gray-600">{service.duration} minutes</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t mt-4">
                  <div className="flex justify-between font-medium">
                    <span>Total Paid</span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: service.currency,
                      }).format(service.price)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-gray-600">
                Booking information not available.
              </p>
            )}
          </CardContent>
        </Card>
        
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">
            A confirmation email has been sent to your registered email address.
            Your booking will appear in your bookings list shortly.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={() => router.push("/bookings")}
              className="bg-primary hover:bg-primary/90"
            >
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => router.push("/spa-services")}>
              Book Another Service
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <p className="mb-2 font-medium">Please Note:</p>
            <p>It may take a few moments for your booking to appear in your bookings list while our system processes the payment confirmation.</p>
          </div>
        </div>
      </main>
      
      <Navigation />
    </div>
  )
} 
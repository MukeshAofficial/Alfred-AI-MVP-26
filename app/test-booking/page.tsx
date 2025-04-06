"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createTestBooking } from "@/lib/test-booking"
import { Loader2 } from "lucide-react"

export default function TestBookingPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateTestBooking = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const response = await createTestBooking()
      setResult(response)
    } catch (err: any) {
      console.error("Error creating test booking:", err)
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-12">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Test Booking Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Click the button below to create a test booking record directly in the database.</p>
          
          <Button 
            onClick={handleCreateTestBooking} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Test Booking"
            )}
          </Button>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md mt-4">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
          
          {result && (
            <div className="p-3 bg-green-50 text-green-600 rounded-md mt-4">
              <p className="font-semibold">Success!</p>
              <p>Booking ID: {result.data?.id}</p>
              <p className="text-xs mt-2">See console for more details</p>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            <p>This will create a booking with:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>Service ID: 70ae3d89-983f-48b7-9627-81e117b7c05c</li>
              <li>User ID: 5c517562-f4e1-488f-9136-74ad5d4d52e0</li>
              <li>Vendor ID: 025d32a6-bbfe-41fd-a8e2-05cacfe0e65b</li>
              <li>Booking Date: April 6, 2025</li>
            </ul>
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/profile?tab=bookings"}
              className="w-full"
            >
              Go to Profile Bookings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
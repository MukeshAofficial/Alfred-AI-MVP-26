"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SpaFormData } from "@/types/spa"
import { SpaDB } from "@/lib/spa-db"
import { useToast } from "@/hooks/use-toast"

export default function NewSpaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const spaDb = SpaDB.getInstance()
  
  const [formData, setFormData] = useState<SpaFormData>({
    name: "",
    description: "",
    location: "",
    status: "active",
    opening_hours: {
      monday: { start: "09:00", end: "18:00" },
      tuesday: { start: "09:00", end: "18:00" },
      wednesday: { start: "09:00", end: "18:00" },
      thursday: { start: "09:00", end: "18:00" },
      friday: { start: "09:00", end: "18:00" },
      saturday: { start: "10:00", end: "17:00" },
      sunday: { start: "10:00", end: "17:00" }
    },
    capacity: 20,
    amenities: [],
    images: []
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }
  
  const handleOpeningHoursChange = (day: string, type: 'start' | 'end', value: string) => {
    setFormData({
      ...formData,
      opening_hours: {
        ...formData.opening_hours,
        [day]: {
          ...formData.opening_hours[day as keyof typeof formData.opening_hours],
          [type]: value
        }
      }
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const spa = await spaDb.createSpa(formData)
      
      if (spa) {
        toast({
          title: "Success",
          description: `Spa "${formData.name}" has been created.`,
        })
        router.push('/admin/spa')
      } else {
        throw new Error("Failed to create spa")
      }
    } catch (error) {
      console.error("Error creating spa:", error)
      toast({
        title: "Error",
        description: "Failed to create spa. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Add New Spa</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/spa')}
          >
            Cancel
          </Button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Spa Information</CardTitle>
              <CardDescription>Enter the details for the new spa facility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter spa name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the spa and its features"
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g. Building A, Floor 2"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity || ""}
                  onChange={(e) => handleInputChange("capacity", parseInt(e.target.value) || undefined)}
                  placeholder="Number of people"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Opening Hours</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Weekdays</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={formData.opening_hours.monday.start}
                        onChange={(e) => handleOpeningHoursChange("monday", "start", e.target.value)}
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={formData.opening_hours.monday.end}
                        onChange={(e) => handleOpeningHoursChange("monday", "end", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Weekends</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        value={formData.opening_hours.saturday.start}
                        onChange={(e) => {
                          handleOpeningHoursChange("saturday", "start", e.target.value)
                          handleOpeningHoursChange("sunday", "start", e.target.value)
                        }}
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={formData.opening_hours.saturday.end}
                        onChange={(e) => {
                          handleOpeningHoursChange("saturday", "end", e.target.value)
                          handleOpeningHoursChange("sunday", "end", e.target.value)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Create Spa"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
} 
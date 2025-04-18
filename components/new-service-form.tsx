"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SpaServiceFormData } from "@/types/spa"
import { SpaDB } from "@/lib/spa-db"
import { useToast } from "@/hooks/use-toast"

// Define service categories
const SERVICE_CATEGORIES = [
  "Massage",
  "Body Rituals",
  "Facials",
  "Hand & Foot Treatments",
  "Waxing",
  "Other"
];

interface NewServiceFormProps {
  spaId: string
  onSuccess?: () => void
}

export function NewServiceForm({ spaId, onSuccess }: NewServiceFormProps) {
  const { toast } = useToast()
  const spaDb = SpaDB.getInstance()
  
  const [formData, setFormData] = useState<SpaServiceFormData>({
    name: "",
    description: "",
    spa_id: spaId,
    price: 0,
    currency: "USD",
    duration: 60,
    status: "available",
    therapists: [],
    special_requirements: "",
    images: [],
    category: "Massage" // Default category
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTherapist, setNewTherapist] = useState("")
  
  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }
  
  const addTherapist = () => {
    if (newTherapist.trim() !== "") {
      setFormData({
        ...formData,
        therapists: [...(formData.therapists || []), newTherapist.trim()]
      })
      setNewTherapist("")
    }
  }
  
  const removeTherapist = (index: number) => {
    const updatedTherapists = [...(formData.therapists || [])]
    updatedTherapists.splice(index, 1)
    setFormData({
      ...formData,
      therapists: updatedTherapists
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Add category to special_requirements
      const serviceData = {
        ...formData,
        special_requirements: `Category: ${formData.category}${formData.special_requirements ? '\n' + formData.special_requirements : ''}`
      };
      
      const service = await spaDb.createSpaService(serviceData)
      
      if (service) {
        toast({
          title: "Success",
          description: `Service "${formData.name}" has been created.`,
        })
        
        // Reset form
        setFormData({
          name: "",
          description: "",
          spa_id: spaId,
          price: 0,
          currency: "USD",
          duration: 60,
          status: "available",
          therapists: [],
          special_requirements: "",
          images: [],
          category: "Massage"
        })
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess()
        }
      } else {
        throw new Error("Failed to create service")
      }
    } catch (error) {
      console.error("Error creating service:", error)
      toast({
        title: "Error",
        description: "Failed to create service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Service Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="e.g. Swedish Massage"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Describe the service and its benefits"
          rows={3}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleInputChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price || ""}
            onChange={(e) => handleInputChange("price", parseFloat(e.target.value) || 0)}
            placeholder="Price"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={formData.currency}
            onValueChange={(value) => handleInputChange("currency", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="5"
            step="5"
            value={formData.duration || ""}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              handleInputChange("duration", isNaN(value) ? 0 : value);
            }}
            placeholder="Duration in minutes"
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
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="special_requirements">Special Requirements or Notes</Label>
        <Textarea
          id="special_requirements"
          value={formData.special_requirements || ""}
          onChange={(e) => handleInputChange("special_requirements", e.target.value)}
          placeholder="Any special requirements or notes for this service"
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Therapists</Label>
        <div className="flex space-x-2">
          <Input
            value={newTherapist}
            onChange={(e) => setNewTherapist(e.target.value)}
            placeholder="Add therapist name"
            className="flex-1"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={addTherapist}
            disabled={!newTherapist.trim()}
          >
            Add
          </Button>
        </div>
        
        {formData.therapists && formData.therapists.length > 0 && (
          <div className="mt-2 space-y-2">
            {formData.therapists.map((therapist, index) => (
              <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                <span>{therapist}</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-500"
                  onClick={() => removeTherapist(index)}
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Service"}
        </Button>
      </div>
    </form>
  )
} 
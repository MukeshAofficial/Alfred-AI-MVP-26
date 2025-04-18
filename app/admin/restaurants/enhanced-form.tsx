"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RestaurantFormData } from "@/types/restaurant"
import { RestaurantDB } from "@/lib/restaurant-db"
import { useToast } from "@/hooks/use-toast"
import { Loader2, X, Plus, Upload, Link, Phone, Facebook, Instagram, Twitter, Globe } from "lucide-react"

interface EnhancedRestaurantFormProps {
  initialData?: Partial<RestaurantFormData>;
  restaurantId?: string;
  onSuccess?: () => void;
}

export function EnhancedRestaurantForm({ initialData, restaurantId, onSuccess }: EnhancedRestaurantFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const restaurantDb = RestaurantDB.getInstance()
  const isEditing = !!restaurantId
  
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: "",
    description: "",
    location: "",
    status: "active",
    cuisine_type: "",
    price_range: "$$",
    opening_hours: {
      monday: { start: "09:00", end: "22:00" },
      tuesday: { start: "09:00", end: "22:00" },
      wednesday: { start: "09:00", end: "22:00" },
      thursday: { start: "09:00", end: "22:00" },
      friday: { start: "09:00", end: "23:00" },
      saturday: { start: "10:00", end: "23:00" },
      sunday: { start: "10:00", end: "22:00" }
    },
    capacity: 50,
    features: [],
    images: [],
    image_urls: [],
    is_featured: false,
    dietary_options: [],
    mealtimes: {
      breakfast: { start: "07:00", end: "11:00" },
      lunch: { start: "12:00", end: "15:00" },
      dinner: { start: "18:00", end: "22:00" }
    },
    website: "",
    phone: "",
    social_media: {
      facebook: "",
      instagram: "",
      twitter: "",
      tripadvisor: ""
    }
  })
  
  // Feature options
  const featureOptions = [
    "Outdoor Seating", 
    "Live Music", 
    "Private Dining", 
    "Wheelchair Accessible", 
    "Parking Available",
    "Free WiFi",
    "Dog Friendly",
    "Waterfront View",
    "Rooftop Dining",
    "Air Conditioning",
    "Bar",
    "Wine List"
  ]
  
  // Dietary options
  const dietaryOptions = [
    "Vegetarian Options",
    "Vegan Options",
    "Gluten-Free Options",
    "Dairy-Free Options",
    "Nut-Free Options",
    "Halal",
    "Kosher",
    "Organic",
    "Low Carb",
    "Keto Friendly"
  ]
  
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        // Use the newer image_urls field if available, or fallback to images
        image_urls: initialData.image_urls || initialData.images || [],
        // Ensure we have default values for all the required fields
        opening_hours: initialData.opening_hours || prev.opening_hours,
        mealtimes: initialData.mealtimes || prev.mealtimes,
        social_media: initialData.social_media || prev.social_media
      }))
    }
  }, [initialData])
  
  const handleInputChange = (field: string, value: string | number | string[] | boolean | object) => {
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
  
  const handleMealtimeChange = (meal: string, type: 'start' | 'end', value: string) => {
    setFormData({
      ...formData,
      mealtimes: {
        ...formData.mealtimes,
        [meal]: {
          ...formData.mealtimes?.[meal as keyof typeof formData.mealtimes] || { start: "", end: "" },
          [type]: value
        }
      }
    })
  }
  
  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData({
      ...formData,
      social_media: {
        ...formData.social_media,
        [platform]: value
      }
    })
  }
  
  const handleImageAdd = () => {
    const url = prompt("Enter image URL")
    if (url) {
      setFormData({
        ...formData,
        image_urls: [...(formData.image_urls || []), url]
      })
    }
  }
  
  const handleImageRemove = (index: number) => {
    const newImages = [...(formData.image_urls || [])]
    newImages.splice(index, 1)
    setFormData({
      ...formData,
      image_urls: newImages
    })
  }
  
  const handleFeatureToggle = (feature: string) => {
    const features = formData.features || []
    if (features.includes(feature)) {
      handleInputChange('features', features.filter(f => f !== feature))
    } else {
      handleInputChange('features', [...features, feature])
    }
  }
  
  const handleDietaryToggle = (option: string) => {
    const options = formData.dietary_options || []
    if (options.includes(option)) {
      handleInputChange('dietary_options', options.filter(o => o !== option))
    } else {
      handleInputChange('dietary_options', [...options, option])
    }
  }
  
  const validateForm = (): boolean => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Restaurant name is required.",
        variant: "destructive",
      })
      setActiveTab("basic")
      return false
    }
    
    if (!formData.description) {
      toast({
        title: "Error",
        description: "Restaurant description is required.",
        variant: "destructive",
      })
      setActiveTab("basic")
      return false
    }
    
    if (!formData.location) {
      toast({
        title: "Error",
        description: "Restaurant location is required.",
        variant: "destructive",
      })
      setActiveTab("basic")
      return false
    }
    
    if (!formData.cuisine_type) {
      toast({
        title: "Error",
        description: "Cuisine type is required.",
        variant: "destructive",
      })
      setActiveTab("basic")
      return false
    }
    
    return true
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsSubmitting(true)
    
    try {
      let result
      
      if (isEditing) {
        result = await restaurantDb.updateEnhancedRestaurant(restaurantId, formData)
      } else {
        result = await restaurantDb.createEnhancedRestaurant(formData)
      }
      
      if (result) {
        toast({
          title: "Success",
          description: `Restaurant "${formData.name}" has been ${isEditing ? 'updated' : 'created'}.`,
        })
        
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/admin/restaurants')
        }
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} restaurant`)
      }
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} restaurant:`, error)
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} restaurant. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="hours">Hours & Availability</TabsTrigger>
          <TabsTrigger value="media">Media & Features</TabsTrigger>
          <TabsTrigger value="contact">Contact & Social</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the basic details for your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="required">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter restaurant name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="required">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Describe the restaurant and its specialties"
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location" className="required">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="e.g. 123 Main Street, City"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cuisine_type" className="required">Cuisine Type</Label>
                  <Input
                    id="cuisine_type"
                    value={formData.cuisine_type}
                    onChange={(e) => handleInputChange("cuisine_type", e.target.value)}
                    placeholder="e.g. Italian, Japanese, Indian"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price_range">Price Range</Label>
                  <Select
                    value={formData.price_range}
                    onValueChange={(value) => handleInputChange("price_range", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$">$ (Inexpensive)</SelectItem>
                      <SelectItem value="$$">$$ (Moderate)</SelectItem>
                      <SelectItem value="$$$">$$$ (Expensive)</SelectItem>
                      <SelectItem value="$$$$">$$$$ (Very Expensive)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured || false}
                  onCheckedChange={(checked) => handleInputChange("is_featured", checked)}
                />
                <Label htmlFor="is_featured">Feature this restaurant on the homepage</Label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => router.push('/admin/restaurants')}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setActiveTab("hours")}>
                Next: Hours & Availability
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Hours & Availability</CardTitle>
              <CardDescription>
                Set your restaurant's opening hours and meal service times
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Opening Hours</h3>
                <div className="space-y-4">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <div key={day} className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium capitalize">{day}</div>
                      <div className="col-span-2 flex items-center space-x-2">
                        <Input
                          type="time"
                          value={formData.opening_hours[day as keyof typeof formData.opening_hours].start}
                          onChange={(e) => handleOpeningHoursChange(day, "start", e.target.value)}
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={formData.opening_hours[day as keyof typeof formData.opening_hours].end}
                          onChange={(e) => handleOpeningHoursChange(day, "end", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Meal Service Times</h3>
                <div className="space-y-4">
                  {['breakfast', 'lunch', 'dinner', 'brunch'].map((meal) => (
                    <div key={meal} className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium capitalize">{meal}</div>
                      <div className="col-span-2 flex items-center space-x-2">
                        <Input
                          type="time"
                          value={formData.mealtimes?.[meal as keyof typeof formData.mealtimes]?.start || ""}
                          onChange={(e) => handleMealtimeChange(meal, "start", e.target.value)}
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={formData.mealtimes?.[meal as keyof typeof formData.mealtimes]?.end || ""}
                          onChange={(e) => handleMealtimeChange(meal, "end", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setActiveTab("basic")}>
                Previous: Basic Info
              </Button>
              <Button type="button" onClick={() => setActiveTab("media")}>
                Next: Media & Features
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media & Features</CardTitle>
              <CardDescription>
                Upload images and select restaurant features and dietary options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Restaurant Images</h3>
                <div className="flex flex-wrap gap-4">
                  {formData.image_urls?.map((url, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden">
                      <img src={url} alt="Restaurant" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleImageRemove(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-24 h-24 flex flex-col items-center justify-center"
                    onClick={handleImageAdd}
                  >
                    <Upload className="h-5 w-5 mb-1" />
                    <span className="text-xs">Add Image</span>
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Restaurant Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {featureOptions.map((feature) => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Switch
                        id={`feature-${feature}`}
                        checked={(formData.features || []).includes(feature)}
                        onCheckedChange={() => handleFeatureToggle(feature)}
                      />
                      <Label htmlFor={`feature-${feature}`}>{feature}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Dietary Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {dietaryOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Switch
                        id={`dietary-${option}`}
                        checked={(formData.dietary_options || []).includes(option)}
                        onCheckedChange={() => handleDietaryToggle(option)}
                      />
                      <Label htmlFor={`dietary-${option}`}>{option}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setActiveTab("hours")}>
                Previous: Hours & Availability
              </Button>
              <Button type="button" onClick={() => setActiveTab("contact")}>
                Next: Contact & Social
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact & Social Media</CardTitle>
              <CardDescription>
                Add contact information and social media links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => handleInputChange("website", e.target.value)}
                    placeholder="https://example.com"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+1 (123) 456-7890"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <h3 className="text-lg font-medium mt-6 mb-4">Social Media Links</h3>
              
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Facebook className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="facebook"
                    value={formData.social_media?.facebook || ""}
                    onChange={(e) => handleSocialMediaChange("facebook", e.target.value)}
                    placeholder="https://facebook.com/yourrestaurant"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="instagram"
                    value={formData.social_media?.instagram || ""}
                    onChange={(e) => handleSocialMediaChange("instagram", e.target.value)}
                    placeholder="https://instagram.com/yourrestaurant"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Twitter className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="twitter"
                    value={formData.social_media?.twitter || ""}
                    onChange={(e) => handleSocialMediaChange("twitter", e.target.value)}
                    placeholder="https://twitter.com/yourrestaurant"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tripadvisor">TripAdvisor</Label>
                <div className="flex">
                  <div className="flex items-center px-3 bg-muted border border-r-0 rounded-l-md">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="tripadvisor"
                    value={formData.social_media?.tripadvisor || ""}
                    onChange={(e) => handleSocialMediaChange("tripadvisor", e.target.value)}
                    placeholder="https://tripadvisor.com/yourrestaurant"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setActiveTab("media")}>
                Previous: Media & Features
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Restaurant" : "Create Restaurant"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  )
} 
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, Clock, AlertCircle, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ServicesDB, ServiceData, ServiceCategory, ServiceFilter } from "@/lib/services-db"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function ServiceGrid() {
  const router = useRouter()
  const servicesDB = new ServicesDB()

  const [services, setServices] = useState<ServiceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ServiceFilter>({})
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [filters])

  const fetchServices = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await servicesDB.getServices(filters)
      setServices(data)
    } catch (err: any) {
      console.error("Error fetching services:", err)
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFilters(prev => ({
      ...prev,
      searchQuery: value.length > 0 ? value : undefined
    }))
  }

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      category: value === "all" ? undefined : value as ServiceCategory
    }))
  }

  const handlePriceRangeChange = (min?: number, max?: number) => {
    setFilters(prev => ({
      ...prev,
      minPrice: min,
      maxPrice: max
    }))
  }

  const getCategoryLabel = (category: ServiceCategory | undefined) => {
    switch (category) {
      case 'restaurant': return 'Restaurant';
      case 'spa': return 'Spa & Wellness';
      case 'tour': return 'Tours & Excursions';
      case 'transport': return 'Transportation';
      case 'entertainment': return 'Entertainment';
      case 'other': return 'Other';
      default: return 'All Services';
    }
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters section */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-20">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Search & Filter</h2>
              <div className="space-y-4">
                <Input
                  placeholder="Search services..."
                  value={filters.searchQuery || ""}
                  onChange={handleSearchChange}
                  className="w-full"
                />

                <div className="space-y-2">
                  <label htmlFor="category-filter" className="text-sm font-medium">
                    Category
                  </label>
                  <Select
                    value={filters.category || "all"}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="spa">Spa & Wellness</SelectItem>
                      <SelectItem value="tour">Tours & Excursions</SelectItem>
                      <SelectItem value="transport">Transportation</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="price">
                    <AccordionTrigger className="text-sm font-medium">
                      Price Range
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handlePriceRangeChange(undefined, undefined)}
                        >
                          Any price
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handlePriceRangeChange(undefined, 50)}
                        >
                          Under $50
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handlePriceRangeChange(50, 100)}
                        >
                          $50 - $100
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handlePriceRangeChange(100, 200)}
                        >
                          $100 - $200
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handlePriceRangeChange(200, undefined)}
                        >
                          $200+
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setFilters({})}
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {getCategoryLabel(filters.category)}
            </h1>
            <div className="text-sm text-muted-foreground">
              {services.length} services found
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive flex gap-2 items-start">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <p className="font-medium">Error loading services</p>
                <p>{error}</p>
              </div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No services found with the current filters.</p>
              <Button onClick={() => setFilters({})}>Clear Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="overflow-hidden flex flex-col h-full">
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {service.images && service.images.length > 0 ? (
                      <img
                        src={service.images[0]}
                        alt={service.name}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Image"
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                        No Image
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {getCategoryLabel(service.category as ServiceCategory)}
                    </Badge>
                  </div>
                  <CardHeader className="p-4 pb-2 flex-1">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{service.name}</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {service.business_name || "Service Provider"}
                    </div>
                    <CardDescription className="mt-2 line-clamp-2">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 pb-2">
                    <div className="flex flex-wrap gap-3 mt-2">
                      {service.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{service.location}</span>
                        </div>
                      )}
                      {service.duration && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{service.duration} mins</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex items-center justify-between">
                    <div className="font-semibold">
                      {service.currency} {service.price.toFixed(2)}
                    </div>
                    <Link href={`/services/${service.id}`}>
                      <Button size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
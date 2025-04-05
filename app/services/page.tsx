"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Filter, MapPin, Star, Clock, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import ServiceGrid from "@/components/services/service-grid"

// Mock data for vendor services
const mockServices = [
  {
    id: "1",
    name: "Gourmet Dining Experience",
    category: "restaurant",
    vendor: "Le Petit Bistro",
    location: "Main Hotel, Ground Floor",
    rating: 4.8,
    price: "$$",
    image: "/placeholder.svg?height=200&width=300",
    description:
      "Experience fine dining with our award-winning chef. Featuring local ingredients and seasonal specialties.",
    availability: "Daily, 6:00 PM - 10:00 PM",
    slug: "the-grand-bistro",
  },
  {
    id: "2",
    name: "Relaxation Massage",
    category: "spa",
    vendor: "Serenity Spa",
    location: "East Wing, 3rd Floor",
    rating: 4.9,
    price: "$$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Unwind with our signature massage therapy designed to relieve stress and tension.",
    availability: "Daily, 9:00 AM - 8:00 PM",
    slug: "serenity-spa",
  },
  {
    id: "3",
    name: "City Tour",
    category: "tour",
    vendor: "Urban Explorers",
    location: "Hotel Lobby",
    rating: 4.7,
    price: "$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Discover the city's hidden gems with our expert local guides. Tours last approximately 3 hours.",
    availability: "Mon-Sat, 10:00 AM & 2:00 PM",
    slug: "urban-explorers",
  },
  {
    id: "4",
    name: "Airport Transfer",
    category: "transportation",
    vendor: "Premium Rides",
    location: "Hotel Entrance",
    rating: 4.6,
    price: "$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Comfortable and reliable transportation to and from the airport in luxury vehicles.",
    availability: "24/7, Advance booking required",
    slug: "premium-rides",
  },
  {
    id: "5",
    name: "Wine Tasting",
    category: "entertainment",
    vendor: "Vineyard Delights",
    location: "Hotel Bar, Mezzanine",
    rating: 4.8,
    price: "$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Sample exquisite wines from around the world with our sommelier.",
    availability: "Fri-Sun, 5:00 PM - 7:00 PM",
    slug: "vineyard-delights",
  },
  {
    id: "6",
    name: "Yoga Session",
    category: "spa",
    vendor: "Mindful Movement",
    location: "Garden Pavilion",
    rating: 4.7,
    price: "$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Start your day with rejuvenating yoga sessions suitable for all experience levels.",
    availability: "Daily, 7:00 AM & 5:00 PM",
    slug: "zen-wellness",
  },
  {
    id: "7",
    name: "Sunset Cruise",
    category: "tour",
    vendor: "Ocean Voyages",
    location: "Marina (10 min from hotel)",
    rating: 4.9,
    price: "$$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Sail along the coast and enjoy breathtaking views of the sunset with champagne service.",
    availability: "Daily, Departure at 5:30 PM",
    slug: "ocean-voyages",
  },
  {
    id: "8",
    name: "Artisan Gift Shop",
    category: "retail",
    vendor: "Local Treasures",
    location: "West Wing, Ground Floor",
    rating: 4.5,
    price: "$$",
    image: "/placeholder.svg?height=200&width=300",
    description: "Unique handcrafted souvenirs and gifts made by local artisans.",
    availability: "Daily, 9:00 AM - 9:00 PM",
    slug: "local-treasures",
  },
]

export default function ServicesPage() {
  return (
    <div className="container">
      <ServiceGrid />
    </div>
  )
}


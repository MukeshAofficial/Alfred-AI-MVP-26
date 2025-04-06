"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Edit, Trash, Plus, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ServicesDB, ServiceData } from "@/lib/services-db"

export default function VendorServiceList() {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [servicesDB] = useState(() => new ServicesDB())

  const [services, setServices] = useState<ServiceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're only rendering client-side to avoid hydration mismatches
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && profile?.id) {
      fetchServices()
    }
  }, [profile, isClient])

  const fetchServices = async () => {
    if (!profile?.id) return;
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await servicesDB.getVendorServices(profile.id)
      setServices(data)
    } catch (err: any) {
      console.error("Error fetching services:", err)
      setError(err.message || "An unexpected error occurred")
      toast({
        title: "Error loading services",
        description: err.message || "Failed to load your services",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (serviceId: string) => {
    router.push(`/vendor/services/edit/${serviceId}`)
  }

  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return
    
    try {
      await servicesDB.deleteService(serviceToDelete)
      setServices((prev) => prev.filter((service) => service.id !== serviceToDelete))
      toast({
        title: "Service deleted",
        description: "The service has been deleted successfully.",
      })
    } catch (err: any) {
      console.error("Error deleting service:", err)
      toast({
        title: "Error deleting service",
        description: err.message || "Failed to delete the service",
        variant: "destructive",
      })
    } finally {
      setServiceToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  if (!isClient) {
    return null; // Don't render anything during SSR to avoid hydration mismatch
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Services</h2>
        <Button asChild>
          <Link href="/vendor/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Service
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive flex gap-2 items-start">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error loading services</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={fetchServices}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {!error && services.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">You haven't added any services yet.</p>
            <Button asChild>
              <Link href="/vendor/services/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden h-full flex flex-col">
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
              </div>
              <CardHeader className="p-4 pb-0 flex-1">
                <CardTitle className="text-xl">{service.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {service.currency} {service.price.toFixed(2)}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service.id!)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(service.id!)}
                    >
                      <Trash className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this service. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 
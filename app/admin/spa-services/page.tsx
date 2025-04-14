"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, Clock, Plus, Edit, Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AdminSpaService } from "@/types/spa"
import { SpaDB } from "@/lib/spa-db"

export default function SpaServicesPage() {
  const [services, setServices] = useState<AdminSpaService[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<AdminSpaService | null>(null)
  const [dbSetupError, setDbSetupError] = useState<string | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const spaDb = SpaDB.getInstance()
  
  useEffect(() => {
    fetchServices()
  }, [])
  
  const fetchServices = async () => {
    setLoading(true)
    setDbSetupError(null)
    try {
      // Check if tables exist first
      const tablesExist = await spaDb.checkTablesExist();
      if (!tablesExist) {
        setDbSetupError("Required database tables do not exist. Please initialize the database from the Spas page.");
        setLoading(false);
        return;
      }
      
      // If tables exist, fetch services
      const servicesData = await spaDb.getAllSpaServices()
      setServices(servicesData)
    } catch (error) {
      console.error("Failed to fetch spa services:", error)
      let errorMessage = "Failed to load spa services. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for database setup errors
        if (errorMessage.includes("database") && errorMessage.includes("tables")) {
          setDbSetupError(errorMessage)
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteService = async () => {
    if (!serviceToDelete) return
    
    try {
      const success = await spaDb.deleteSpaService(serviceToDelete.id)
      if (success) {
        toast({
          title: "Success",
          description: `Service "${serviceToDelete.name}" has been deleted.`,
        })
        fetchServices()
      } else {
        throw new Error("Failed to delete service")
      }
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setServiceToDelete(null)
    }
  }
  
  const openDeleteDialog = (service: AdminSpaService) => {
    setServiceToDelete(service)
    setIsDeleteDialogOpen(true)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "unavailable":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      case "featured":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }
  
  // Format price with currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price)
  }
  
  // Filter services based on search query and status filter
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.spa?.name.toLowerCase().includes(searchQuery.toLowerCase()) || false
    
    const matchesStatus = statusFilter === "all" ? true : service.status === statusFilter
    
    return matchesSearch && matchesStatus
  })
  
  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Spa Services</h1>
          <p className="text-muted-foreground">Manage spa treatments and services</p>
        </div>
        
        <Button 
          onClick={() => router.push('/admin/spa-services/new')}
          className="bg-primary hover:bg-primary/90"
          disabled={!!dbSetupError}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Service
        </Button>
      </div>
      
      {dbSetupError && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            {dbSetupError}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            disabled={!!dbSetupError}
          />
        </div>
        
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
          disabled={!!dbSetupError}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p>Loading services...</p>
        </div>
      ) : dbSetupError ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-amber-600 mb-4">Database Setup Required</h2>
          <p className="text-muted-foreground mb-6">{dbSetupError}</p>
          <div className="max-w-xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-md">
            <p className="mb-4">To fix this issue, you need to initialize the database with required tables:</p>
            <ol className="list-decimal list-inside text-left mb-4 space-y-2">
              <li>Go to the main Spas page</li>
              <li>Click the "Initialize Database" button</li>
              <li>Once the initialization is complete, return to this page</li>
            </ol>
            <Button 
              onClick={() => router.push('/admin/spa')}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Go to Spas Page
            </Button>
          </div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No spa services found</p>
          <Button 
            onClick={() => router.push('/admin/spa-services/new')}
            variant="outline"
          >
            Add a new service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="mr-2">{service.name}</CardTitle>
                    {service.spa && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.spa.name}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(service.status)}>
                    {service.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatPrice(service.price, service.currency)}</span>
                  </div>
                  
                  {service.duration && (
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{service.duration} minutes</span>
                    </div>
                  )}
                  
                  {service.therapists && service.therapists.length > 0 && (
                    <div className="flex flex-col text-sm mt-2">
                      <span className="font-medium mb-1">Therapists:</span>
                      <div className="flex flex-wrap gap-1">
                        {service.therapists.map((therapist, index) => (
                          <Badge key={index} variant="outline" className="bg-gray-100 dark:bg-gray-800">
                            {therapist}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/admin/spa-services/${service.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openDeleteDialog(service)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the service "{serviceToDelete?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
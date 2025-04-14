"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Clock, Users, Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AdminSpa } from "@/types/spa"
import { SpaDB } from "@/lib/spa-db"

export default function AdminSpasPage() {
  const [spas, setSpas] = useState<AdminSpa[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [spaToDelete, setSpaToDelete] = useState<AdminSpa | null>(null)
  const [dbSetupError, setDbSetupError] = useState<string | null>(null)
  const [isSettingUpDb, setIsSettingUpDb] = useState(false)
  const [isDbSetupDialogOpen, setIsDbSetupDialogOpen] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const spaDb = SpaDB.getInstance()
  
  useEffect(() => {
    fetchSpas()
  }, [])
  
  const fetchSpas = async () => {
    setLoading(true)
    setDbSetupError(null)
    try {
      // Check if tables exist first
      const tablesExist = await spaDb.checkTablesExist();
      if (!tablesExist) {
        setDbSetupError("Required database tables do not exist. Initialize the database to create tables.");
        setLoading(false);
        setIsDbSetupDialogOpen(true);
        return;
      }
      
      // If tables exist, fetch spas
      const spasData = await spaDb.getAllSpas()
      setSpas(spasData)
    } catch (error) {
      console.error("Failed to fetch spas:", error)
      let errorMessage = "Failed to load spas. Please try again."
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Check for database setup errors
        if (errorMessage.includes("database") && errorMessage.includes("tables")) {
          setDbSetupError(errorMessage)
          setIsDbSetupDialogOpen(true);
        }
      }
      
      toast({
        title: "Database Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  
  const setupDatabase = async () => {
    setIsSettingUpDb(true)
    try {
      const result = await spaDb.runSetupScripts()
      
      if (result.success) {
        // Show custom message depending on what was created
        if (result.created && result.created.length > 0) {
          toast({
            title: "Database Setup Complete",
            description: `Created tables: ${result.created.join(', ')}`,
          })
        } else {
          toast({
            title: "Database Ready",
            description: "All required tables already exist.",
          })
        }
        
        // Fetch spas after successful setup
        fetchSpas()
        setIsDbSetupDialogOpen(false)
      } else {
        toast({
          title: "Setup Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error setting up database:", error)
      toast({
        title: "Setup Error",
        description: "Failed to set up database tables. Please check console for details.",
        variant: "destructive",
      })
    } finally {
      setIsSettingUpDb(false)
    }
  }
  
  const handleDeleteSpa = async () => {
    if (!spaToDelete) return
    
    try {
      const success = await spaDb.deleteSpa(spaToDelete.id)
      if (success) {
        toast({
          title: "Success",
          description: `Spa "${spaToDelete.name}" has been deleted.`,
        })
        fetchSpas()
      } else {
        throw new Error("Failed to delete spa")
      }
    } catch (error) {
      console.error("Error deleting spa:", error)
      toast({
        title: "Error",
        description: "Failed to delete spa. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setSpaToDelete(null)
    }
  }
  
  const openDeleteDialog = (spa: AdminSpa) => {
    setSpaToDelete(spa)
    setIsDeleteDialogOpen(true)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "inactive":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      case "maintenance":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  // Filter spas based on search query and status filter
  const filteredSpas = spas.filter(spa => {
    const matchesSearch = spa.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          spa.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          spa.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "all" ? true : spa.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
      <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
          <h1 className="text-3xl font-bold">Spas</h1>
          <p className="text-muted-foreground">Manage spa facilities and locations</p>
          </div>

          <div className="flex gap-2">
          {dbSetupError && (
            <Button 
              onClick={() => setIsDbSetupDialogOpen(true)}
              variant="outline"
              className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              Initialize Database
            </Button>
          )}
          
          <Button 
            onClick={() => router.push('/admin/spa/new')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Spa
            </Button>
          </div>
        </div>

      {dbSetupError && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-6">
          <AlertTitle>Database Setup Required</AlertTitle>
          <AlertDescription>
            {dbSetupError}
          </AlertDescription>
        </Alert>
      )}
      
            <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
                <Input
            placeholder="Search spas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
                />
              </div>

        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <p>Loading spas...</p>
                      </div>
      ) : dbSetupError ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-amber-600 mb-4">Database Setup Required</h2>
          <p className="text-muted-foreground mb-6">{dbSetupError}</p>
          <div className="max-w-xl mx-auto p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="mb-4">To fix this issue, you need to initialize the database with required tables:</p>
            <ol className="list-decimal list-inside text-left mb-4 space-y-2">
              <li>Make sure your Supabase project is properly set up</li> 
              <li>Click the "Initialize Database" button to create required tables</li>
              <li>This will create the tables admin_spas, admin_spa_services, and admin_spa_bookings</li>
            </ol>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => fetchSpas()} 
                variant="outline"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => setIsDbSetupDialogOpen(true)}
                disabled={isSettingUpDb}
              >
                {isSettingUpDb ? "Setting Up..." : "Initialize Database"}
              </Button>
                </div>
              </div>
            </div>
      ) : filteredSpas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No spas found</p>
                              <Button
            onClick={() => router.push('/admin/spa/new')}
                                variant="outline"
          >
            Add a new spa
                                  </Button>
                            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpas.map((spa) => (
            <Card key={spa.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="mr-2">{spa.name}</CardTitle>
                  <Badge className={getStatusColor(spa.status)}>
                    {spa.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{spa.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{spa.location}</span>
                  </div>
                  
                  {spa.capacity && (
                    <div className="flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Capacity: {spa.capacity} people</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>Mon-Fri: {spa.opening_hours.monday.start} - {spa.opening_hours.monday.end}</span>
                      <span>Sat-Sun: {spa.opening_hours.saturday.start} - {spa.opening_hours.saturday.end}</span>
                    </div>
                            </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/admin/spa/${spa.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => openDeleteDialog(spa)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
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
              Are you sure you want to delete the spa "{spaToDelete?.name}"? 
              This action cannot be undone and will also delete all services associated with this spa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
                      </Button>
            <Button variant="destructive" onClick={handleDeleteSpa}>
              Delete
                      </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Database Setup Dialog */}
      <Dialog open={isDbSetupDialogOpen} onOpenChange={setIsDbSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initialize Database Tables</DialogTitle>
            <DialogDescription>
              This will create all the necessary database tables for the spa booking system to work correctly.
              This includes tables for spas, services, and bookings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-blue-50 border-blue-200 text-blue-700 mb-4">
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>
                You only need to run this once. If the tables already exist, this operation will not modify them.
              </AlertDescription>
            </Alert>
            
            {isSettingUpDb && (
              <p className="text-center py-2">Setting up database tables. Please wait...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDbSetupDialogOpen(false)} disabled={isSettingUpDb}>
              Cancel
            </Button>
            <Button onClick={setupDatabase} disabled={isSettingUpDb}>
              {isSettingUpDb ? "Setting Up..." : "Initialize Database"}
            </Button>
          </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  )
}
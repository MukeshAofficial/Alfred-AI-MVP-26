"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ServicesDB, ServiceData } from "@/lib/services-db"

// Simple minimal component for maximum performance
export default function VendorServicesPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [services, setServices] = useState<ServiceData[]>([])
  const [loading, setLoading] = useState(true)

  // Load services on mount
  useEffect(() => {
    // Skip if no profile yet
    if (!profile?.id) return;
    
    async function loadServices() {
      try {
        const db = new ServicesDB();
        // Non-null assertion since we already checked profile?.id above
        const data = await db.getVendorServices(profile!.id);
        setServices(data);
      } catch (err) {
        console.error("Failed to load services:", err);
        toast({
          title: "Error",
          description: "Could not load your services. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadServices();
  }, [profile, toast]);

  // Handle edit service
  function handleEdit(id: string) {
    router.push(`/vendor/services/edit/${id}`);
  }

  // Handle delete service
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }
    
    try {
      setLoading(true);
      const db = new ServicesDB();
      await db.deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Success",
        description: "Service deleted successfully"
      });
    } catch (err) {
      console.error("Failed to delete service:", err);
      toast({
        title: "Error",
        description: "Could not delete service. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  if (!profile) {
    return <div>Please log in</div>;
  }

  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Your Services</h1>
        <Button asChild>
          <Link href="/vendor/services/new">
            <Plus className="mr-2 h-4 w-4" />Add Service
          </Link>
        </Button>
      </div>

      {/* Simple loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* No services message */}
      {!loading && services.length === 0 && (
        <div className="text-center py-8 border rounded-md">
          <p className="mb-4">You don't have any services yet.</p>
          <Button asChild>
            <Link href="/vendor/services/new">Add Your First Service</Link>
          </Button>
        </div>
      )}

      {/* Simple list view for better performance */}
      {!loading && services.length > 0 && (
        <div className="border rounded-md divide-y">
          {services.map(service => (
            <div key={service.id} className="p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{service.name}</h3>
                <p className="text-sm text-gray-500 truncate max-w-lg">{service.description}</p>
                <p className="text-sm">{service.currency} {service.price.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(service.id!)}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDelete(service.id!)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


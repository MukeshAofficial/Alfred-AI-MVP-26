"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ServiceForm from "@/components/vendor/service-form"
import { use } from "react"

interface EditServicePageProps {
  params: {
    id: string
  }
}

export default function EditServicePage({ params }: EditServicePageProps) {
  // Properly unwrap params using React.use
  const unwrappedParams = use(params);
  const serviceId = unwrappedParams.id;
  
  const { profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!profile) {
      router.push("/login")
    } else if (profile.role !== "vendor") {
      router.push("/403")
    }
  }, [profile, router])

  if (!profile) {
    return null
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Service</h1>
      <ServiceForm serviceId={serviceId} />
    </div>
  )
} 
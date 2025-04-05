"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ServiceForm from "@/components/vendor/service-form"

interface EditServicePageProps {
  params: {
    id: string
  }
}

export default function EditServicePage({ params }: EditServicePageProps) {
  const { profile } = useAuth()
  const router = useRouter()
  const serviceId = params.id

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
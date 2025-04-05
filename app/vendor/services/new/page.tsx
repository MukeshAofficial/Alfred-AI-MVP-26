"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import ServiceForm from "@/components/vendor/service-form"

export default function NewServicePage() {
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
      <h1 className="text-2xl font-bold mb-6">Add New Service</h1>
      <ServiceForm />
    </div>
  )
}


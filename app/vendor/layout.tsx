import type React from "react"
import VendorNavigation from "@/components/vendor/vendor-navigation"

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <VendorNavigation />
      <main className="flex-1">{children}</main>
    </div>
  )
}


"use client"

import { Button } from "@/components/ui/button"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

export default function HomeNavigation() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-300 bg-background/80 backdrop-blur-md",
        isScrolled ? "shadow-sm border-b" : "",
      )}
    >
      <div className="container flex items-center justify-between h-16 px-4">
        <Link href="/" className="font-bold text-xl">
          The AI Butler
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
              pathname === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary",
            )}
          >
            Home
          </Link>
          <Link
            href="/services"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
              pathname === "/services" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary",
            )}
          >
            Services
          </Link>
          <Link
            href="/explore"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
              pathname === "/explore" ? "text-primary font-medium" : "text-muted-foreground hover:text-primary",
            )}
          >
            Explore
          </Link>
        </nav>

        <div className="hidden md:flex items-center space-x-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/guest/register">
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Register
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}


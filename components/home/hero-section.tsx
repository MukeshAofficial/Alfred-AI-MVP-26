"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Particles from "react-particles"
import { loadSlim } from "tsparticles-slim"
import type { Container, Engine } from "tsparticles-engine"
import { Hotel, ShoppingBag, User } from "lucide-react"

export default function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const particlesInit = async (engine: Engine) => {
    await loadSlim(engine)
  }

  const particlesLoaded = async (container: Container | undefined) => {
    // console.log(container)
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-background to-primary/5">
      {/* Particles background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        loaded={particlesLoaded}
        className="absolute inset-0"
        options={{
          background: {
            color: {
              value: "transparent",
            },
          },
          fpsLimit: 120,
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "grab",
              },
              resize: true,
            },
            modes: {
              grab: {
                distance: 140,
                line_linked: {
                  opacity: 0.5,
                },
              },
            },
          },
          particles: {
            color: {
              value: "#6d28d9",
            },
            links: {
              color: "#6d28d9",
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
            },
            move: {
              direction: "none",
              enable: true,
              outModes: {
                default: "bounce",
              },
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 80,
            },
            opacity: {
              value: 0.3,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
            },
          },
          detectRetina: true,
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 pt-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your AI-Powered Butler for a Seamless Hotel Experience
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-xl text-muted-foreground mb-8">
              Smart bookings, instant service, and AI-driven hospitality.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-full" asChild>
              <Link href="/services">Explore Services</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 rounded-full"
              asChild
            >
              <Link href="/login">Sign In</Link>
            </Button>
          </motion.div>

          {/* Role-based registration options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-12"
          >
            <h2 className="text-xl font-semibold mb-6">Register as:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/guest/register" className="w-full">
                <div className="bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl p-6 transition-all duration-300 border border-white/20 h-full">
                  <User className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">Guest</h3>
                  <p className="text-sm text-muted-foreground">Access personalized hotel services and experiences</p>
                </div>
              </Link>

              <Link href="/admin/pre-register" className="w-full">
                <div className="bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl p-6 transition-all duration-300 border border-white/20 h-full">
                  <Hotel className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">Hotel</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your hotel and provide AI-powered services to guests
                  </p>
                </div>
              </Link>

              <Link href="/vendor/pre-register" className="w-full">
                <div className="bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl p-6 transition-all duration-300 border border-white/20 h-full">
                  <ShoppingBag className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-medium mb-2">Vendor</h3>
                  <p className="text-sm text-muted-foreground">
                    Offer your services to hotel guests through our platform
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}


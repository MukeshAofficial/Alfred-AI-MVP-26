import HomeNavigation from "@/components/home/home-navigation"
import HeroSection from "@/components/home/hero-section"
import KeyFeaturesSection from "@/components/home/key-features-section"
import HowItWorksSection from "@/components/home/how-it-works-section"
import ServicesSection from "@/components/home/services-section"
import VendorPortalSection from "@/components/home/vendor-portal-section"
import FaqSection from "@/components/home/faq-section"
import Footer from "@/components/home/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <HomeNavigation />
      <main>
        <HeroSection />
        
        {/* Authentication Paths Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Join Our Platform</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="bg-card rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-4">Hotel Guests</h3>
                <p className="text-muted-foreground mb-6">Experience luxury at your fingertips</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/guest/register">Register as Guest</Link>
                </Button>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-4">Hotel Managers</h3>
                <p className="text-muted-foreground mb-6">Enhance your hotel's guest experience</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/admin/pre-register">Register Hotel</Link>
                </Button>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-6 flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-4">Service Vendors</h3>
                <p className="text-muted-foreground mb-6">Offer your services to hotel guests</p>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/vendor/pre-register">Register as Vendor</Link>
                </Button>
              </div>
            </div>
            
            <div className="mt-8">
              <p className="text-muted-foreground mb-4">Already have an account?</p>
              <Button asChild size="lg">
                <Link href="/login">Login Now</Link>
              </Button>
            </div>
          </div>
        </section>
        
        <KeyFeaturesSection />
        <ServicesSection />
        <HowItWorksSection />
        <VendorPortalSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  )
}


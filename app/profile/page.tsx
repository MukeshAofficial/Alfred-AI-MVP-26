"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Settings, CreditCard, LogOut, Calendar, Loader2 } from "lucide-react"
import Header from "@/components/header"
import Navigation from "@/components/navigation"
import { useMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import UserBookings from "@/components/user-bookings"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { createBookingFromSession } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("profile")
  const isMobile = useMobile()
  const { profile, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessingBooking, setIsProcessingBooking] = useState(false)

  // Check for tab parameter in URL
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['profile', 'preferences', 'payment', 'bookings'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
    
    // Also check for success parameter to show toast for successful booking
    const success = searchParams?.get('success')
    const sessionId = searchParams?.get('session_id')
    const bookingDate = searchParams?.get('booking_date')
    
    if (success === 'true' && sessionId && sessionId !== '{CHECKOUT_SESSION_ID}' && profile?.id) {
      setActiveTab('bookings')
      
      // Check if we need to create a booking via fallback method
      const processFallbackBooking = async () => {
        try {
          setIsProcessingBooking(true)
          
          // Get the service ID from the success URL
          const serviceId = sessionId.split('_').length > 2 ? sessionId.split('_')[2] : null
          
          if (!serviceId || !bookingDate) {
            console.error('Missing service ID or booking date for fallback booking creation');
            return;
          }
          
          console.log(`Attempting fallback booking creation for session ${sessionId}`);
          
          const response = await createBookingFromSession({
            sessionId,
            serviceId,
            userId: profile.id,
            bookingDate: bookingDate || new Date().toISOString().split('T')[0]
          });
          
          if (response.success) {
            if (response.alreadyExists) {
              toast({
                title: "Booking Confirmed",
                description: "Your booking has already been processed successfully.",
              });
            } else {
              toast({
                title: "Booking Created",
                description: "Your booking was successfully created and is now visible in your bookings tab.",
              });
            }
            
            // Remove query parameters after successful booking
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            url.searchParams.delete('session_id');
            url.searchParams.delete('booking_date');
            url.searchParams.set('tab', 'bookings');
            window.history.replaceState({}, '', url.toString());
          }
        } catch (error: any) {
          console.error('Error creating fallback booking:', error);
          toast({
            title: "Booking Error",
            description: "There was an issue creating your booking. Please contact support.",
            variant: "destructive",
          });
        } finally {
          setIsProcessingBooking(false);
        }
      };
      
      // Run the fallback booking creation
      processFallbackBooking();
    }
  }, [searchParams, profile, toast]);

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (!profile) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="My Profile" showNotification />
        <div className="container mx-auto px-4 py-6 flex-1 flex items-center justify-center">
          <Card>
            <CardContent className="p-6">
              <p className="text-center">Please log in to view your profile.</p>
              <Button 
                className="w-full mt-4" 
                onClick={() => router.push('/login')}
              >
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Profile" showNotification />

      {isProcessingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-center">Processing your booking...</p>
          </div>
        </div>
      )}

      <div className={cn("container mx-auto px-4 py-6 flex-1", isMobile ? "pb-20" : "")}>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Summary */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={profile.avatar_url || "/placeholder.svg?height=100&width=100"} alt={profile.full_name || 'User'} />
                    <AvatarFallback>{profile.full_name ? profile.full_name.charAt(0) : 'U'}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{profile.full_name || 'User'}</h2>
                  <p className="text-gray-500 mb-2">{profile.email || ''}</p>
                  {profile.membership_tier && (
                    <Badge className="mb-4">{profile.membership_tier} Member</Badge>
                  )}

                  {profile.loyalty_points !== undefined && (
                    <>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${Math.min((profile.loyalty_points / 3000) * 100, 100)}%` }}
                        ></div>
                  </div>
                      <p className="text-sm text-gray-500 mb-6">
                        {profile.loyalty_points} points • {Math.max(0, 3000 - profile.loyalty_points)} points to next tier
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Card className="mt-6">
                <CardContent className="p-0">
                  <div className="divide-y">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start rounded-none h-12",
                        activeTab === "profile" && "bg-primary/10 text-primary",
                      )}
                      onClick={() => setActiveTab("profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Personal Information
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start rounded-none h-12",
                        activeTab === "preferences" && "bg-primary/10 text-primary",
                      )}
                      onClick={() => setActiveTab("preferences")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Preferences
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start rounded-none h-12",
                        activeTab === "payment" && "bg-primary/10 text-primary",
                      )}
                      onClick={() => setActiveTab("payment")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Methods
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start rounded-none h-12",
                        activeTab === "bookings" && "bg-primary/10 text-primary",
                      )}
                      onClick={() => setActiveTab("bookings")}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      My Bookings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start rounded-none h-12 text-red-500"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="w-full md:w-2/3">
            {isMobile ? (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full mb-6">
                  <TabsTrigger value="profile" className="flex-1">
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="preferences" className="flex-1">
                    Preferences
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="flex-1">
                    Payment
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex-1">
                    Bookings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Manage your personal details and contact information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={profile.full_name || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={profile.email || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" defaultValue={profile.phone || ''} />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save Changes</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="preferences">
                  <Card>
                    <CardHeader>
                      <CardTitle>Stay Preferences</CardTitle>
                      <CardDescription>Customize your stay experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Room Temperature</Label>
                        <Input id="temperature" defaultValue={profile.preferences?.roomTemperature || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pillow">Pillow Type</Label>
                        <select id="pillow" className="w-full p-2 border rounded">
                          <option>Memory Foam</option>
                          <option>Feather</option>
                          <option>Firm</option>
                          <option>Soft</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dietary">Dietary Restrictions</Label>
                        <Input id="dietary" defaultValue={profile.preferences?.dietaryRestrictions || 'None'} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wakeup">Wake-up Calls</Label>
                        <input
                          type="checkbox"
                          id="wakeup"
                          defaultChecked={profile.preferences?.wakeUpCalls === "Yes"}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="newspaper">Newspaper Delivery</Label>
                        <input
                          type="checkbox"
                          id="newspaper"
                          defaultChecked={profile.preferences?.newspaperDelivery?.startsWith("Yes")}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save Preferences</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="payment">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>Manage your payment options</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {profile.paymentMethods && profile.paymentMethods.length > 0 ? (
                      <div className="space-y-4">
                          {profile.paymentMethods.map((card) => (
                          <div key={card.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-6 bg-gray-200 rounded mr-3"></div>
                              <div>
                                <p className="font-medium">
                                  {card.type} •••• {card.last4}
                                </p>
                                <p className="text-sm text-gray-500">Expires {card.expiry}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {card.isDefault && (
                                <Badge variant="outline" className="mr-2">
                                  Default
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No payment methods added yet.</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button>Add Payment Method</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>

                <TabsContent value="bookings">
                  <Card>
                    <CardHeader>
                      <CardTitle>My Bookings</CardTitle>
                      <CardDescription>View and manage your reservations</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <UserBookings compactMode={true} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div>
                {activeTab === "profile" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Manage your personal details and contact information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={profile.full_name || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={profile.email || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" defaultValue={profile.phone || ''} />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save Changes</Button>
                    </CardFooter>
                  </Card>
                )}

                {activeTab === "preferences" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Stay Preferences</CardTitle>
                      <CardDescription>Customize your stay experience</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="temperature">Room Temperature</Label>
                        <Input id="temperature" defaultValue={profile.preferences?.roomTemperature || ''} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pillow">Pillow Type</Label>
                        <select id="pillow" className="w-full p-2 border rounded">
                          <option>Memory Foam</option>
                          <option>Feather</option>
                          <option>Firm</option>
                          <option>Soft</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dietary">Dietary Restrictions</Label>
                        <Input id="dietary" defaultValue={profile.preferences?.dietaryRestrictions || 'None'} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wakeup">Wake-up Calls</Label>
                        <input
                          type="checkbox"
                          id="wakeup"
                          defaultChecked={profile.preferences?.wakeUpCalls === "Yes"}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="newspaper">Newspaper Delivery</Label>
                        <input
                          type="checkbox"
                          id="newspaper"
                          defaultChecked={profile.preferences?.newspaperDelivery?.startsWith("Yes")}
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button>Save Preferences</Button>
                    </CardFooter>
                  </Card>
                )}

                {activeTab === "payment" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Methods</CardTitle>
                      <CardDescription>Manage your payment options</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {profile.paymentMethods && profile.paymentMethods.length > 0 ? (
                      <div className="space-y-4">
                          {profile.paymentMethods.map((card) => (
                          <div key={card.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex items-center">
                              <div className="w-10 h-6 bg-gray-200 rounded mr-3"></div>
                              <div>
                                <p className="font-medium">
                                  {card.type} •••• {card.last4}
                                </p>
                                <p className="text-sm text-gray-500">Expires {card.expiry}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              {card.isDefault && (
                                <Badge variant="outline" className="mr-2">
                                  Default
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm">
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No payment methods added yet.</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button>Add Payment Method</Button>
                    </CardFooter>
                  </Card>
                )}

                {activeTab === "bookings" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Bookings</CardTitle>
                      <CardDescription>View and manage your reservations</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <UserBookings compactMode={true} />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Navigation />
    </div>
  )
}


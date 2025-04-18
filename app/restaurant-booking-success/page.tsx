"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Calendar, Clock, ArrowLeft, Users, Utensils, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import Navigation from "@/components/navigation";
import { RestaurantDB } from "@/lib/restaurant-db";
import { AdminRestaurant } from "@/types/restaurant";
import { Loader2 } from "lucide-react";

// Fallback component for Suspense
function BookingSuccessFallback() {
  return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// Component with useSearchParams logic
function BookingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<AdminRestaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const restaurantId = searchParams.get("restaurantId");
  const bookingDate = searchParams.get("bookingDate");
  const partySize = searchParams.get("partySize");
  const tableId = searchParams.get("tableId");

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails(restaurantId);
    } else {
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchRestaurantDetails = async (id: string) => {
    try {
      const restaurantDb = RestaurantDB.getInstance();
      const restaurantData = await restaurantDb.getRestaurantById(id);
      setRestaurant(restaurantData);
    } catch (error) {
      console.error("Failed to fetch restaurant details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date not provided";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Reservation Confirmed" />
      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <Button
          variant="ghost"
          className="mb-6 -ml-2"
          onClick={() => router.push("/restaurants")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Restaurants
        </Button>

        <div className="max-w-md mx-auto text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Reservation Confirmed!</h1>
          <p className="text-gray-600">
            Your restaurant reservation has been successfully booked and confirmed.
          </p>
        </div>

        <Card className="max-w-md mx-auto mb-8">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold mb-4">Reservation Details</h2>

            {loading ? (
              <p className="text-center py-4">Loading reservation details...</p>
            ) : restaurant ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Restaurant</p>
                  <p className="text-gray-600">{restaurant.name}</p>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-gray-600">{restaurant.location}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Date and Time</p>
                    <p className="text-gray-600">{formatDate(bookingDate)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Users className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                  <div>
                    <p className="font-medium">Party Size</p>
                    <p className="text-gray-600">
                      {partySize} {parseInt(partySize || "1") === 1 ? "person" : "people"}
                    </p>
                  </div>
                </div>

                {tableId && (
                  <div className="flex items-start">
                    <Utensils className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">Table</p>
                      <p className="text-gray-600">Table #{tableId}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t mt-4">
                  <div className="flex justify-between font-medium">
                    <span>Reservation Fee</span>
                    <span>
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(Math.max(10 * parseInt(partySize || "1"), 20))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    This amount will be deducted from your final bill
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center py-4 text-gray-600">
                Reservation information not available.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="max-w-md mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">
            A confirmation email has been sent to your registered email address.
            Your reservation will appear in your bookings list shortly.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              onClick={() => router.push("/bookings")}
              className="bg-primary hover:bg-primary/90"
            >
              View My Bookings
            </Button>
            <Button variant="outline" onClick={() => router.push("/restaurants")}>
              Explore More Restaurants
            </Button>
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <p className="mb-2 font-medium">Please Note:</p>
            <p>
              It may take a few moments for your reservation to appear in your bookings list
              while our system processes the payment confirmation.
            </p>
            <p className="mt-2">Please arrive 10 minutes before your reservation time.</p>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}

export default function RestaurantBookingSuccessPage() {
  return (
    <Suspense fallback={<BookingSuccessFallback />}>
      <BookingSuccessContent />
    </Suspense>
  );
}
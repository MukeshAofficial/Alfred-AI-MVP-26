"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CreditCard, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServicesDB, ServiceData } from "@/lib/services-db";
import { createCheckoutSession } from "@/lib/actions";
import { useToast } from "@/components/ui/use-toast";
import Header from "@/components/header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Suspense } from "react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const { toast } = useToast();
  const { user } = useAuth();

  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const canceled = searchParams.get("canceled");

  // Handle cancellation feedback
  useEffect(() => {
    if (canceled) {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. Please try again when ready.",
        variant: "destructive",
      });
    }
  }, [canceled, toast]);

  // Fetch service details
  useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!serviceId) {
        setError("No service selected. Please choose a service to book.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const servicesDB = new ServicesDB();
        const serviceData = await servicesDB.getServiceById(serviceId);
        if (!serviceData) {
          throw new Error("Service not found.");
        }
        setService(serviceData);
        setError(null);
      } catch (err) {
        console.error("Error fetching service:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load service details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [serviceId]);

  // Handle checkout process
  const handleCheckout = async () => {
    if (!serviceId || !service) {
      toast({
        title: "Error",
        description: "No service selected for checkout.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const bookingDateParam = bookingDate || new Date().toISOString().split("T")[0];
      const { sessionUrl, sessionId } = await createCheckoutSession({
        serviceId,
        bookingDate: bookingDateParam,
        userId: user?.id || "guest",
      });

      if (!sessionUrl) {
        throw new Error("Failed to create checkout session.");
      }

      console.log("Checkout session created, redirecting to:", sessionUrl);

      if (sessionId) {
        localStorage.setItem(
          "lastCheckoutSession",
          JSON.stringify({
            sessionId,
            serviceId,
            userId: user?.id || "guest",
            bookingDate: bookingDateParam,
            timestamp: Date.now(),
          })
        );
      }

      window.location.href = sessionUrl;
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Checkout Error",
        description:
          err instanceof Error
            ? err.message
            : "Something went wrong with the checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pb-20">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Service Checkout</CardTitle>
            <CardDescription>Complete your booking</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-red-500 mb-4">{error}</p>
                <Button
                  onClick={() => router.push("/services")}
                  variant="outline"
                >
                  Browse Services
                </Button>
              </div>
            ) : service ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold">{service.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.business_name || "Service Provider"}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bookingDate">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Booking Date
                      </Label>
                      <Input
                        id="bookingDate"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Service Price
                        </span>
                        <span className="font-medium">
                          {service.currency} {service.price.toFixed(2)}
                        </span>
                      </div>
                      {service.duration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Duration
                          </span>
                          <span>{service.duration} minutes</span>
                        </div>
                      )}
                      {service.location && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Location
                          </span>
                          <span>{service.location}</span>
                        </div>
                      )}
                      <div className="border-t mt-4 pt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>
                            {service.currency} {service.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      className="w-full"
                      onClick={handleCheckout}
                      disabled={isProcessing || !bookingDate}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay with Stripe
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Secure payment processing by Stripe
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  No service selected.
                </p>
                <Button
                  onClick={() => router.push("/services")}
                  variant="outline"
                >
                  Browse Services
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Checkout" />
      <Suspense
        fallback={
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <CheckoutContent />
      </Suspense>
    </div>
  );
}

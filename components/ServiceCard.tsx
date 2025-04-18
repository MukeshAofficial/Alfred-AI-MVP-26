import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { AdminSpaService } from '@/types/spa';
import { createCheckoutSession } from '@/lib/actions';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

interface ServiceCardProps {
  service: AdminSpaService;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(getTomorrowDate());
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Get tomorrow's date for default booking date
  function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  const handleBookService = () => {
    setIsBookingDialogOpen(true);
  };
  
  const handleBooking = async () => {
    if (!selectedDate) return;
    
    setProcessingPayment(true);
    try {
      // Format the date as YYYY-MM-DD
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Create a Stripe checkout session
      const result = await createCheckoutSession({
        serviceId: service.id,
        bookingDate: formattedDate,
        userId: user?.id,
      });
      
      if (result?.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = result.sessionUrl;
      } else {
        throw new Error("Could not create checkout session");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "There was a problem processing your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Format price with currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Extract category from special_requirements if available
  const getServiceCategory = () => {
    if (service.special_requirements && service.special_requirements.includes('Category:')) {
      const match = service.special_requirements.match(/Category:\s*([^\n]+)/);
      if (match && match[1]) {
        const category = match[1].trim();
        console.log(`ServiceCard - ${service.name}: Found category: ${category}`);
        return category;
      }
    }
    console.log(`ServiceCard - ${service.name}: No category found, defaulting to 'Other'`);
    return 'Other';
  };

  return (
    <>
      <Card className="overflow-hidden h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>{service.name}</CardTitle>
            <div className="text-lg font-bold text-purple-600">
              {formatPrice(service.price, service.currency)}
            </div>
          </div>
          {getServiceCategory() !== 'Other' && (
            <div className="text-sm text-gray-500 mt-1">
              {getServiceCategory()}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-gray-600 mb-4">{service.description}</p>
          
          <div className="flex flex-col space-y-2">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>{service.duration} minutes</span>
            </div>
            
            {service.therapists && service.therapists.length > 0 && (
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                <span>
                  {service.therapists.length} {service.therapists.length === 1 ? 'therapist' : 'therapists'} available
                </span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <Button 
            className="w-full" 
            onClick={handleBookService}
          >
            Book Now
          </Button>
        </CardFooter>
      </Card>
      
      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Select a date for your spa appointment.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <h3 className="font-medium">{service.name}</h3>
              <p className="text-sm text-muted-foreground">{service.duration} minutes - {formatPrice(service.price, service.currency)}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Select Date</h4>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date > new Date(new Date().setMonth(new Date().getMonth() + 3))}
                  className="border rounded-md p-2"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={!selectedDate || processingPayment} 
              onClick={handleBooking}
            >
              {processingPayment ? "Processing..." : "Proceed to Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServiceCard;
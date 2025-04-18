import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminSpaService } from '@/types/spa';

interface ServiceCardProps {
  service: AdminSpaService;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const router = useRouter();

  const handleBookService = (serviceId: string) => {
    router.push(`/spa-services/${serviceId}`);
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
          onClick={() => handleBookService(service.id)}
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard; 
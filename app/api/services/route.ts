import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  images: string[];
  created_at: string;
  updated_at: string;
  vendor_id: string;
  category: string;
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Fetch all services
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select(`
        id, 
        name, 
        description, 
        price, 
        duration,
        images,
        created_at,
        updated_at,
        vendor_id,
        category
      `)
    
    if (servicesError) {
      console.error("Error fetching services:", servicesError)
      return NextResponse.json({ error: "Error fetching services" }, { status: 500 })
    }

    // Format the data in a structure suitable for the AI agent
    const formattedData = {
      hotel: {
        name: "The AI Butler Hotel",
        services: (services as Service[]).map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          price: service.price,
          duration: service.duration,
          vendor: "Hotel Service", // Default when vendor info is not available
          type: service.category || "general",
          location: "At the hotel", // Default location
        }))
      },
      restaurants: (services as Service[])
        .filter(service => service.category === "restaurant")
        .map(service => ({
          name: service.name,
          cuisine: "Fine Dining", // This could be a field in your service or vendor table
          menu: [
            {
              item: service.name,
              description: service.description,
              price: `$${service.price}`
            }
          ]
        })),
      spa_services: (services as Service[])
        .filter(service => service.category === "spa")
        .map(service => ({
          name: service.name,
          description: service.description,
          duration: service.duration,
          price: service.price
        })),
      attractions: (services as Service[])
        .filter(service => 
          service.category === "tour" || service.category === "entertainment"
        )
        .map(service => ({
          name: service.name,
          description: service.description,
          location: "Nearby", // Default location
          price: service.price
        }))
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
} 
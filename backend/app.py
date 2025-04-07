from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langgraph.prebuilt import create_react_agent
import json
import os
import requests
import time
from typing import Dict, Any, List

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API URL from environment or default
FRONTEND_API_URL = os.environ.get("FRONTEND_API_URL", "http://localhost:3000")

# Cache for services
services_cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 300  # 5 minutes
}

# Service category keywords
SERVICE_CATEGORIES = {
    "restaurant": ["restaurant", "dining", "food", "eat", "meal", "breakfast", "lunch", "dinner", "café", "cafe", "bistro"],
    "spa": ["spa", "massage", "wellness", "relax", "relaxation", "facial", "treatment", "therapy"],
    "transport": ["transport", "taxi", "car", "shuttle", "airport", "transfer", "ride", "transportation", "pickup", "uber"],
    "tour": ["tour", "excursion", "sightseeing", "guide", "visit", "attraction", "activity", "adventure"],
    "entertainment": ["entertainment", "show", "movie", "theater", "concert", "event", "tickets", "nightlife"],
    "room_service": ["room service", "housekeeping", "laundry", "cleaning", "turndown", "amenities"],
}

def fetch_services() -> Dict[str, Any]:
    """Fetch services from the Next.js API, with caching and error handling"""
    current_time = time.time()
    if services_cache["data"] and current_time - services_cache["timestamp"] < services_cache["ttl"]:
        print("Using cached services data")
        return services_cache["data"]
    
    try:
        print(f"Fetching fresh services data from API: {FRONTEND_API_URL}/api/services")
        response = requests.get(f"{FRONTEND_API_URL}/api/services", timeout=5)
        if response.status_code == 200:
            data = response.json()
            # Update cache
            services_cache["data"] = data
            services_cache["timestamp"] = current_time
            return data
        else:
            print(f"Error fetching services data: HTTP {response.status_code}")
            return create_empty_services_data()
    except Exception as e:
        print(f"Exception fetching services data: {str(e)}")
        return create_empty_services_data()

def create_empty_services_data() -> Dict[str, Any]:
    """Create a default service data structure"""
    return {
        "hotel": {"name": "The AI Butler Hotel", "services": []},
        "restaurants": [],
        "spa_services": [],
        "attractions": []
    }

def create_mock_taxi_service() -> Dict[str, Any]:
    """Create sample taxi service data for testing"""
    return {
        "hotel": {
            "name": "The AI Butler Hotel", 
            "services": [{
                "id": "taxi-service-1",
                "name": "Hotel Taxi Service",
                "description": "24/7 taxi service for hotel guests. Available for airport transfers, city tours, and general transportation needs.",
                "price": 25,
                "duration": 0,
                "vendor": "Reliable Taxi Co.",
                "type": "transport",
                "location": "Hotel entrance",
            }]
        },
        "restaurants": [],
        "spa_services": [],
        "attractions": []
    }

def identify_service_categories(query: str) -> List[str]:
    """Identify service categories mentioned in the query"""
    query = query.lower()
    return [category for category, keywords in SERVICE_CATEGORIES.items() if any(k in query for k in keywords)]

def format_transportation_services(data: Dict[str, Any]) -> str:
    """Format transportation services data for the response"""
    services = [s for s in data.get("hotel", {}).get("services", []) if s.get("type") == "transport"]
    
    if not services:
        return "I'm sorry, but I don't have any information about transportation services at the moment. Would you like me to check with our concierge desk for transportation options?"
    
    result = "Here are the transportation services available through our hotel:\n\n"
    
    for i, s in enumerate(services, 1):
        result += f"{i}. **{s.get('name', 'Taxi Service')}**\n"
        result += f"   - {s.get('description', 'No description available')}\n"
        if s.get("price") is not None:
            result += f"   - Starting price: ${s.get('price')}\n"
        if s.get("vendor"):
            result += f"   - Provided by: {s.get('vendor')}\n"
        if s.get("location"):
            result += f"   - Pickup location: {s.get('location')}\n"
        result += "\n"
    
    result += "Would you like to book a taxi? I can help arrange a pickup time and location. [CALENDAR]"
    return result

def format_restaurant_services(restaurants: List[Dict]) -> str:
    """Format restaurant services data for the response"""
    if not restaurants:
        return "I'm sorry, but we don't have any restaurant information available at the moment. Our concierge would be happy to recommend nearby dining options."
    
    result = "Here are the dining options available at our hotel:\n\n"
    
    for i, r in enumerate(restaurants, 1):
        result += f"{i}. **{r.get('name', 'Restaurant')}**\n"
        result += f"   - Cuisine: {r.get('cuisine', 'Various cuisines')}\n"
        
        for item in r.get("menu", [])[:3]:
            result += f"     • {item.get('item', 'Dish')} - {item.get('price', 'Price varies')}\n"
        
        result += "\n"
    
    result += "Would you like to make a reservation at any of these restaurants? [CALENDAR]"
    return result

def format_spa_services(spa: List[Dict]) -> str:
    """Format spa services data for the response"""
    if not spa:
        return "I'm sorry, but we don't have any spa services information available at the moment. Our concierge can recommend relaxation options."
    
    result = "Here are the spa and wellness services available at our hotel:\n\n"
    
    for i, s in enumerate(spa, 1):
        result += f"{i}. **{s.get('name', 'Spa Service')}**\n"
        result += f"   - {s.get('description', 'Relaxing experience')}\n"
        
        if s.get("duration"):
            result += f"   - Duration: {s.get('duration')} minutes\n"
        
        if s.get("price") is not None:
            result += f"   - Price: ${s.get('price')}\n"
        
        result += "\n"
    
    result += "Would you like to book a spa appointment? [CALENDAR]"
    return result

def format_tour_services(tours: List[Dict]) -> str:
    """Format tour and activity services data for the response"""
    if not tours:
        return "I'm sorry, but we don't have any tour or activity information available at the moment. Our concierge can suggest local attractions."
    
    result = "Here are the tours and activities available through our hotel:\n\n"
    
    for i, t in enumerate(tours, 1):
        result += f"{i}. **{t.get('name', 'Activity')}**\n"
        result += f"   - {t.get('description', 'Exciting experience')}\n"
        
        if t.get("location"):
            result += f"   - Location: {t.get('location')}\n"
        
        if t.get("price") is not None:
            price_str = "Free" if t.get('price') == 0 else f"${t.get('price')}"
            result += f"   - Price: {price_str}\n"
        
        result += "\n"
    
    result += "Would you like to book any of these activities? [CALENDAR]"
    return result

def format_entertainment_services(data: Dict[str, Any]) -> str:
    """Format entertainment services data for the response"""
    services = [s for s in data.get("hotel", {}).get("services", []) if s.get("type") == "entertainment"]
    
    if not services:
        return "I'm sorry, but we don't have any entertainment service information available at the moment. Our concierge can recommend entertainment options."
    
    result = "Here are the entertainment options available through our hotel:\n\n"
    
    for i, s in enumerate(services, 1):
        result += f"{i}. **{s.get('name', 'Entertainment')}**\n"
        result += f"   - {s.get('description', 'No description available')}\n"
        
        if s.get("price") is not None:
            price_str = "Free" if s.get('price') == 0 else f"${s.get('price')}"
            result += f"   - Price: {price_str}\n"
        
        if s.get("vendor"):
            result += f"   - Provided by: {s.get('vendor')}\n"
        
        result += "\n"
    
    result += "Would you like me to help you book any of these entertainment options? [CALENDAR]"
    return result

def format_room_service(data: Dict[str, Any]) -> str:
    """Format room service data for the response"""
    # Filter room service related services
    services = [s for s in data.get("hotel", {}).get("services", []) 
                if s.get("type") == "general" and 
                any(k in s.get("name", "").lower() for k in SERVICE_CATEGORIES["room_service"])]
    
    if not services:
        return "We offer 24/7 room service and housekeeping. When would you like to schedule service for your room? [CALENDAR]"
    
    result = "Here are the in-room services available:\n\n"
    
    for i, s in enumerate(services, 1):
        result += f"{i}. **{s.get('name', 'Room Service')}**\n"
        result += f"   - {s.get('description', 'No description available')}\n"
        
        if s.get("price") is not None and s.get("price") > 0:
            result += f"   - Price: ${s.get('price')}\n"
        
        result += "\n"
    
    result += "When would you like to schedule one of these services? [CALENDAR]"
    return result

def service_info_tool(query: str) -> str:
    """Provides information about hotel services based on user queries"""
    # Fetch services data - try to get real data first
    services_data = fetch_services()
    
    # Check if we have any services data at all
    has_any_services = False
    if services_data:
        has_any_services = len(services_data.get("hotel", {}).get("services", [])) > 0
    
    # If we only have "transport" services or if user specifically asked about taxi,
    # and there's no data, use mock taxi service data
    categories = identify_service_categories(query)
    if not has_any_services or ("transport" in categories and not [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "transport"]):
        services_data = create_mock_taxi_service()
    
    # Handle no identified categories
    if not categories:
        # Generic query about services
        if any(term in query.lower() for term in ["service", "offer", "available", "what can you do"]):
            # Get available service types to mention
            available_types = []
            if [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "transport"]:
                available_types.append("transportation")
            if services_data.get("restaurants", []):
                available_types.append("dining")
            if services_data.get("spa_services", []):
                available_types.append("spa services")
            if services_data.get("attractions", []):
                available_types.append("tours and activities")
            if [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "entertainment"]:
                available_types.append("entertainment")
            
            # If we have no available types, use a generic list
            if not available_types:
                available_types = ["transportation", "dining", "spa services", "tours", "entertainment", "room service"]
            
            available_types_str = ", ".join(available_types[:-1])
            if len(available_types) > 1:
                available_types_str += f", and {available_types[-1]}"
            else:
                available_types_str = available_types[0]
            
            return f"""At The AI Butler Hotel, we can assist you with {available_types_str}. 
            
What specific service would you like information about?"""
        
        # Other specific queries
        if "wifi" in query.lower() or "internet" in query.lower() or "password" in query.lower():
            return "Our hotel offers complimentary high-speed WiFi throughout the property. The network name is 'AIButler-Guest' and the password is provided in your welcome package or you can get it from reception."
        
        if "checkout" in query.lower() or "check out" in query.lower() or "leave" in query.lower():
            return "Our standard checkout time is 11:00 AM. Would you like to request a late checkout? [CALENDAR]"
        
        if "checkin" in query.lower() or "check in" in query.lower() or "arrive" in query.lower():
            return "Our standard check-in time is 3:00 PM. Early check-in may be available based on room availability. Would you like me to check if early check-in is possible for your reservation?"
        
        # General query about the hotel
        return "I can provide information about our hotel services including transportation, dining, spa services, tours, entertainment, and room service. What specific service would you like to know more about?"
    
    # Handle specific service category queries
    if "transport" in categories:
        return format_transportation_services(services_data)
    
    if "restaurant" in categories:
        return format_restaurant_services(services_data.get("restaurants", []))
    
    if "spa" in categories:
        return format_spa_services(services_data.get("spa_services", []))
    
    if "tour" in categories:
        return format_tour_services(services_data.get("attractions", []))
    
    if "entertainment" in categories:
        return format_entertainment_services(services_data)
    
    if "room_service" in categories:
        return format_room_service(services_data)
    
    # Fallback - should not normally reach here
    return "I can help you with information about our hotel services. Could you please specify which service you're interested in?"

# Tool configuration
tools = [
    Tool(
        name="ServiceInfoTool",
        func=service_info_tool,
        description="Provides information about hotel services including transportation, dining, spa, tours, entertainment, and room service based on guest queries."
    )
]

# Initialize LLM
llm = ChatOpenAI(
    temperature=0,
    model="gpt-4-turbo-preview",
)

# Create ReAct agent
agent = create_react_agent(llm, tools)

# System prompt
system_prompt = {
    "role": "system",
    "content": """You are Alfred, the AI concierge for The AI Butler Hotel.

Your primary role is to assist hotel guests with information about services offered by the hotel and its vendor partners. Use the ServiceInfoTool to access up-to-date information about available services when guests ask about specific offerings.

Key responsibilities:
1. Provide accurate information about hotel services and vendor offerings
2. Help guests find appropriate services based on their needs
3. Offer suggestions based on available service data
4. Answer questions about transportation, dining, spa services, tours, entertainment and room service

When a guest would like to book a service or schedule something, use the tag [CALENDAR] to indicate a calendar interface should be shown.

For food-related queries that should show a menu, use the tag [FOOD_MENU].

Always be polite, professional, and helpful. If you don't have specific information about a service, acknowledge that and offer to connect the guest with the hotel staff for more assistance.

Do not make up information about services that aren't listed in the data. If a guest asks about something not in your data, politely explain that you'll need to check with the hotel staff for the most current information."""
}

# Request schema
class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
    response = await agent.ainvoke({
        "messages": [
            system_prompt,
            {"role": "user", "content": req.message}
        ]
    })
    last_message = response['messages'][-1]
        return {"response": last_message.content}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"response": "Sorry, something went wrong processing your request. Please try again."}

from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langgraph.prebuilt import create_react_agent
import json
import time
from typing import Dict, Any, List
from datetime import datetime

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chat memory
chat_memory = {}

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
    """Fetch services from mock data file"""
    current_time = time.time()
    if services_cache["data"] and current_time - services_cache["timestamp"] < services_cache["ttl"]:
        return services_cache["data"]
    
    try:
        with open("mock_data.json", "r") as file:
            data = json.load(file)
            services_cache["data"] = data
            services_cache["timestamp"] = current_time
            return data
    except Exception as e:
        print(f"Error loading mock data: {str(e)}")
        return {"hotel": {"name": "The AI Butler Hotel", "services": []}, "restaurants": [], "spa_services": [], "attractions": []}

def identify_service_categories(query: str) -> List[str]:
    """Identify service categories mentioned in the query"""
    query = query.lower()
    return [category for category, keywords in SERVICE_CATEGORIES.items() if any(k in query for k in keywords)]

def format_service_list(services: List[Dict], service_type: str) -> str:
    """Generic function to format any service list"""
    if not services:
        return f"I'm sorry, but we don't have any {service_type} information available at the moment."
    
    result = f"We offer the following {service_type} options for our guests:\n\n"
    
    for i, s in enumerate(services, 1):
        result += f"{i}. {s.get('name', service_type.title())}\n"
        result += f"   Description: {s.get('description', 'No description available')}\n"
        
        if s.get("price") is not None:
            price_str = "Free" if s.get('price') == 0 else f"${s.get('price')}"
            result += f"   Price: {price_str}\n"
        
        if s.get("duration"):
            result += f"   Duration: {s.get('duration')} minutes\n"
        
        if s.get("vendor"):
            result += f"   Provider: {s.get('vendor')}\n"
        
        if s.get("location"):
            result += f"   Location: {s.get('location')}\n"
        
        if s.get("cuisine"):
            result += f"   Cuisine: {s.get('cuisine')}\n"
        
        if s.get("menu"):
            result += "   Featured Menu Items:\n"
            for item in s.get("menu", [])[:3]:
                result += f"     - {item.get('item', 'Dish')} - {item.get('price', 'Price varies')}\n"
                if item.get("description"):
                    result += f"       {item.get('description')}\n"
        
        result += "\n"
    
    result += f"Would you like to book any of these {service_type} options? [CALENDAR]"
    return result

def service_info_tool(query: str) -> str:
    """Provides information about hotel services based on user queries"""
    services_data = fetch_services()
    categories = identify_service_categories(query)
    
    # Check for booking intent
    if "book" in query.lower() or "reserve" in query.lower() or "schedule" in query.lower():
        # Find the service being referenced
        for category in categories:
            if category == "restaurant":
                services = services_data.get("restaurants", [])
            elif category == "spa":
                services = services_data.get("spa_services", [])
            elif category == "tour":
                services = services_data.get("attractions", [])
            else:
                services = [s for s in services_data.get("hotel", {}).get("services", []) 
                          if s.get("type") == category]
            
            for service in services:
                if service.get("name", "").lower() in query.lower():
                    return f"I'll help you book {service.get('name')}. [BOOKING:{service.get('id')}]"
        
        return "I'd be happy to help you make a booking. Could you please specify which service you'd like to book?"
    
    if not categories:
        if any(term in query.lower() for term in ["service", "offer", "available", "what can you do"]):
            available_types = []
            if services_data.get("hotel", {}).get("services", []):
                available_types.append("hotel services")
            if services_data.get("restaurants", []):
                available_types.append("dining")
            if services_data.get("spa_services", []):
                available_types.append("spa services")
            if services_data.get("attractions", []):
                available_types.append("tours and activities")
            
            available_types_str = ", ".join(available_types[:-1])
            if len(available_types) > 1:
                available_types_str += f", and {available_types[-1]}"
            else:
                available_types_str = available_types[0]
            
            return f"At The AI Butler Hotel, we can assist you with {available_types_str}. What specific service would you like information about?"
        
        if "wifi" in query.lower() or "internet" in query.lower():
            return "Our hotel offers complimentary high-speed WiFi throughout the property. The network name is 'AIButler-Guest' and the password is provided in your welcome package."
        
        if "checkout" in query.lower() or "check out" in query.lower():
            return "Our standard checkout time is 11:00 AM. Would you like to request a late checkout? [CALENDAR]"
        
        if "checkin" in query.lower() or "check in" in query.lower():
            return "Our standard check-in time is 3:00 PM. Early check-in may be available based on room availability. [CALENDAR]"
        
        return "I can provide information about our hotel services. What specific service would you like to know more about?"
    
    if "transport" in categories:
        services = [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "transport"]
        return format_service_list(services, "transportation")
    
    if "restaurant" in categories:
        return format_service_list(services_data.get("restaurants", []), "dining")
    
    if "spa" in categories:
        return format_service_list(services_data.get("spa_services", []), "spa")
    
    if "tour" in categories:
        return format_service_list(services_data.get("attractions", []), "tour")
    
    if "entertainment" in categories:
        services = [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "entertainment"]
        return format_service_list(services, "entertainment")
    
    if "room_service" in categories:
        services = [s for s in services_data.get("hotel", {}).get("services", []) if s.get("type") == "room_service"]
        return format_service_list(services, "room service")
    
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

Your primary role is to assist hotel guests with information about services offered by the hotel and its vendor partners. Use the ServiceInfoTool to access up-to-date information about available services.

Key responsibilities:
1. Provide accurate information about hotel services
2. Help guests find appropriate services based on their needs
3. Offer suggestions based on available service data
4. Answer questions about transportation, dining, spa services, tours, entertainment, and room service

When a guest would like to book a service or schedule something, use the tag [CALENDAR].
For food-related queries that should show a menu, use the tag [FOOD_MENU].
For booking a specific service, use the tag [BOOKING:service_id].

Always be polite, professional, and helpful. If you don't have specific information about a service, acknowledge that and offer to connect the guest with the hotel staff."""
}

# Request schema
class ChatRequest(BaseModel):
    message: str
    session_id: str = None

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

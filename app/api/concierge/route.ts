import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" }, 
        { status: 400 }
      )
    }

    // Send the message to the FastAPI backend
    try {
      console.log(`Sending request to backend at: ${BACKEND_URL}/chat`)
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to parse error response" }))
        console.error("Backend error response:", errorData)
        return NextResponse.json(
          { error: errorData.detail || "Failed to get response from AI backend" }, 
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)
      
      // Check if this is a connection error
      if (fetchError instanceof Error && 'cause' in fetchError && 
          fetchError.cause instanceof Error && 'code' in fetchError.cause && 
          fetchError.cause.code === 'ECONNREFUSED') {
        return NextResponse.json(
          { error: "Cannot connect to the AI backend. Please make sure the backend server is running." }, 
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: "Failed to connect to AI backend" }, 
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in concierge API:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" }, 
      { status: 500 }
    )
  }
} 
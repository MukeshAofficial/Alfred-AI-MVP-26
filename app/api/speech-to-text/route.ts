import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    console.log("Processing audio file:", file.name, "Size:", file.size)

    // Convert file to ArrayBuffer
    const buffer = await file.arrayBuffer()

    // Create a Blob from the ArrayBuffer
    const blob = new Blob([buffer], { type: file.type })

    // Create a FormData object for the OpenAI API
    const openaiFormData = new FormData()
    openaiFormData.append("file", blob, file.name)
    openaiFormData.append("model", "whisper-1")

    console.log("Sending request to OpenAI Whisper API")

    // Call OpenAI Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI API error response:", errorText)
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Successfully transcribed audio to:", data.text.substring(0, 50) + "...")

    return NextResponse.json({ text: data.text })
  } catch (error) {
    console.error("Error in speech-to-text:", error)
    return NextResponse.json(
      {
        error: "Failed to process audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
} 
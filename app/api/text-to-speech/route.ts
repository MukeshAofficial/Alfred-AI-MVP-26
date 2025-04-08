import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 })
    }

    console.log("Processing text-to-speech request:", text.substring(0, 50) + "...")

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "nova",
        input: text,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI TTS API error response:", errorText)
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`)
    }

    console.log("Successfully generated speech audio")

    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer()

    // Return the audio data
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  } catch (error) {
    console.error("Error in text-to-speech:", error)
    return NextResponse.json(
      {
        error: "Failed to convert text to speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
} 
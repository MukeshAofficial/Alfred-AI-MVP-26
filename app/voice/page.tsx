"use client"

import { useState, useRef } from "react"
import { Mic, MicOff, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export default function VoicePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await handleSpeechToText(audioBlob)
        
        // Stop all audio tracks
        stream.getAudioTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive"
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleSpeechToText = async (recordedBlob: Blob) => {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append("file", recordedBlob, "recording.webm")

      // Convert speech to text
      const transcriptionResponse = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      })

      if (!transcriptionResponse.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const { text } = await transcriptionResponse.json()
      setTranscript(text)

      // Send to backend FastAPI server
      const chatResponse = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      })

      if (!chatResponse.ok) {
        throw new Error("Failed to get AI response")
      }

      const { response } = await chatResponse.json()
      setAiResponse(response)

      // Convert response to speech
      const speechResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: response }),
      })

      if (!speechResponse.ok) {
        throw new Error("Failed to convert text to speech")
      }

      const audioBlob = await speechResponse.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (error) {
      console.error("Error processing voice request:", error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center space-y-4">
          <motion.button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
              isRecording
                ? "bg-red-500 animate-pulse shadow-red-500/50"
                : isProcessing
                ? "bg-gray-400"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </motion.button>

          {transcript && (
            <div className="w-full bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">You said:</p>
              <p className="mt-1">{transcript}</p>
            </div>
          )}

          {aiResponse && (
            <div className="w-full bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-primary">AI Butler:</p>
              <p className="mt-1">{aiResponse}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import BookingCalendar from "@/components/booking-calendar"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"

type MessageType = "text" | "buttons" | "cards" | "carousel" | "calendar" | "food"
type SenderType = "user" | "ai"

interface Message {
  id: string
  content: string
  sender: SenderType
  type: MessageType
  timestamp: Date
  options?: string[]
  items?: {
    title: string
    description: string
    image: string
    action?: string
  }[]
}

type FormattedLine = string;

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Welcome to The AI Butler. How may I assist you today?",
      sender: "ai",
      type: "buttons",
      timestamp: new Date(),
      options: ["Book Spa", "Order Food", "Room Service", "Local Recommendations"],
    },
  ])
  const [input, setInput] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFoodMenu, setShowFoodMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const isMobile = useMobile()
  const [sessionId, setSessionId] = useState("")

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessageToBackend = async (messageText: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response from AI")
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      })
      return "I'm having trouble connecting right now. Please try again in a moment."
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      type: "text",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    const userInput = input
    setInput("")

    // Add typing indicator
    const typingIndicatorId = Date.now().toString() + "-typing"
    setMessages((prev) => [
      ...prev,
      {
        id: typingIndicatorId,
        content: "Typing...",
        sender: "ai",
        type: "text",
        timestamp: new Date(),
      },
    ])

    try {
      // Get response from backend
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: userInput,
          session_id: sessionId 
        }),
      })

      // Remove typing indicator
      setMessages((prev) => prev.filter(msg => msg.id !== typingIndicatorId))

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = "Failed to get a response. Please try again."
        
        if (errorData.error) {
          errorMessage = errorData.error
        }
        
        const errorResponse: Message = {
          id: Date.now().toString(),
          content: errorMessage,
          sender: "ai",
          type: "text",
          timestamp: new Date(),
        }
        
        setMessages((prev) => [...prev, errorResponse])
        return
      }

      const data = await response.json()
      const aiResponseText = data.response
      
      // Update session ID
      if (data.session_id) {
        setSessionId(data.session_id)
      }
      
      // Check for booking tag
      const bookingMatch = aiResponseText.match(/\[BOOKING:([^\]]+)\]/)
      if (bookingMatch) {
        const serviceId = bookingMatch[1]
        router.push(`/booking/${serviceId}`)
        return
      }
      
      // Check for calendar tag
      if (aiResponseText.includes("[CALENDAR]")) {
        setShowCalendar(true)
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText.replace("[CALENDAR]", ""),
          sender: "ai",
          type: "calendar",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
      } 
      // Check for food menu tag
      else if (aiResponseText.includes("[FOOD_MENU]")) {
        setShowFoodMenu(true)
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText.replace("[FOOD_MENU]", ""),
          sender: "ai",
          type: "carousel",
          timestamp: new Date(),
          items: [
            {
              title: "Breakfast Menu",
              description: "Available 6:30 AM - 11:00 AM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
            {
              title: "All-Day Dining",
              description: "Available 11:00 AM - 10:00 PM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
            {
              title: "Late Night",
              description: "Available 10:00 PM - 6:30 AM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
          ],
        }
        setMessages((prev) => [...prev, aiResponse])
      } 
      // Regular text response with formatting
      else {
        const formattedContent = aiResponseText
          .split('\n')
          .map((line: FormattedLine) => {
            // Format bold text
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Format lists
            line = line.replace(/^\s*-\s*(.*)/g, '• $1')
            // Format prices
            line = line.replace(/\$(\d+)/g, '<span class="text-primary font-medium">$$1</span>')
            // Format durations
            line = line.replace(/(\d+)\s+minutes/g, '<span class="text-muted-foreground">$1 minutes</span>')
            return line
          })
          .join('\n')
        
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: formattedContent,
          sender: "ai",
          type: "text",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
      }
    } catch (error) {
      // Remove typing indicator
      setMessages((prev) => prev.filter(msg => msg.id !== typingIndicatorId))
      
      console.error("Error sending message:", error)
      
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: "I'm having trouble connecting right now. Please check if the backend server is running and try again in a moment.",
        sender: "ai",
        type: "text",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleButtonClick = async (option: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: option,
      sender: "user",
      type: "text",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])

    // Add typing indicator
    const typingIndicatorId = Date.now().toString() + "-typing"
    setMessages((prev) => [
      ...prev,
      {
        id: typingIndicatorId,
        content: "Typing...",
        sender: "ai",
        type: "text",
        timestamp: new Date(),
      },
    ])

    try {
      // Get response from backend
      const response = await fetch("/api/concierge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: option }),
      })

      // Remove typing indicator
      setMessages((prev) => prev.filter(msg => msg.id !== typingIndicatorId))

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = "Failed to get a response. Please try again."
        
        if (errorData.error) {
          errorMessage = errorData.error
          
          // Special case for backend connection errors
          if (errorData.error.includes("Cannot connect to the AI backend")) {
            errorMessage = "I'm unable to connect to my AI brain right now. Please make sure the backend server is running."
          }
        }
        
        const errorResponse: Message = {
          id: Date.now().toString(),
          content: errorMessage,
          sender: "ai",
          type: "text",
          timestamp: new Date(),
        }
        
        setMessages((prev) => [...prev, errorResponse])
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        return
      }

      const data = await response.json()
      const aiResponseText = data.response
      
      // Process response similar to handleSend method
      if (option === "Book Spa" || aiResponseText.includes("[CALENDAR]")) {
        setShowCalendar(true)
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText.replace("[CALENDAR]", ""),
          sender: "ai",
          type: "calendar",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
      } else if (option === "Order Food" || aiResponseText.includes("[FOOD_MENU]")) {
        setShowFoodMenu(true)
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText.replace("[FOOD_MENU]", ""),
          sender: "ai",
          type: "carousel",
          timestamp: new Date(),
          items: [
            {
              title: "Breakfast Menu",
              description: "Available 6:30 AM - 11:00 AM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
            {
              title: "All-Day Dining",
              description: "Available 11:00 AM - 10:00 PM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
            {
              title: "Late Night",
              description: "Available 10:00 PM - 6:30 AM",
              image: "/placeholder.svg?height=120&width=200",
              action: "View Menu",
            },
          ],
        }
        setMessages((prev) => [...prev, aiResponse])
      } else {
        // Regular text response
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: aiResponseText,
          sender: "ai",
          type: "text",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiResponse])
      }
    } catch (error) {
      // Remove typing indicator
      setMessages((prev) => prev.filter(msg => msg.id !== typingIndicatorId))
      
      console.error("Error sending message:", error)
      
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: "I'm having trouble connecting right now. Please check if the backend server is running and try again in a moment.",
        sender: "ai",
        type: "text",
        timestamp: new Date(),
      }
      
      setMessages((prev) => [...prev, errorResponse])
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to the AI backend. Please check if the server is running.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalendarConfirm = (date: Date) => {
    setShowCalendar(false)

    const formattedDate = date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })

    const newAiMessage: Message = {
      id: Date.now().toString(),
      content: `Your spa appointment has been confirmed for ${formattedDate}. We look forward to seeing you!`,
      sender: "ai",
      type: "text",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newAiMessage])

    toast({
      title: "Booking Confirmed",
      description: `Spa appointment scheduled for ${formattedDate}`,
      duration: 5000,
    })
  }

  const handleFoodMenuSelect = (item: string) => {
    setShowFoodMenu(false)

    const newAiMessage: Message = {
      id: Date.now().toString(),
      content: `You've selected the ${item}. Would you like to place an order now?`,
      sender: "ai",
      type: "buttons",
      timestamp: new Date(),
      options: ["Yes, Order Now", "View Full Menu", "Cancel"],
    }

    setMessages((prev) => [...prev, newAiMessage])
  }

  const handleCardAction = (title: string, action: string) => {
    if (title === "The Grand Bistro" || title === "Seaside Grill") {
      const restaurantId = title === "The Grand Bistro" ? "the-grand-bistro" : "seaside-grill"
      router.push(`/restaurants/${restaurantId}`)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className={cn("flex flex-col h-full", isMobile ? "max-w-md mx-auto px-4 pb-4" : "w-full")}>
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.sender === "user" ? "justify-end" : "justify-start")}>
            {message.sender === "ai" && (
              <Avatar className="h-8 w-8 mr-2 mt-1">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="AI Butler" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
            )}

            <div className={cn("max-w-[80%]", message.type === "carousel" && "max-w-full w-full")}>
              {message.type === "text" && (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                    message.id.includes("-typing") && "animate-pulse"
                  )}
                >
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                  <div
                    className={cn("text-xs mt-1 opacity-70", message.sender === "user" ? "text-right" : "text-left")}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              )}

              {message.type === "buttons" && (
                <div className="space-y-3">
                  <div className={cn("rounded-2xl px-4 py-2.5 text-sm bg-muted")}>
                    <p>{message.content}</p>
                    <div className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {message.options?.map((option) => (
                      <Button
                        key={option}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-sm border-primary/30 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleButtonClick(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {message.type === "cards" && (
                <div className="space-y-3">
                  <div className={cn("rounded-2xl px-4 py-2.5 text-sm bg-muted")}>
                    <p>{message.content}</p>
                    <div className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {message.items?.map((item, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-video relative">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full"
                            onClick={() => handleCardAction(item.title, item.action || "")}
                          >
                            {item.action}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {message.type === "carousel" && (
                <div className="space-y-3 w-full">
                  <div className={cn("rounded-2xl px-4 py-2.5 text-sm bg-muted")}>
                    <p>{message.content}</p>
                    <div className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</div>
                  </div>

                  <div className="flex overflow-x-auto pb-2 gap-3 w-full scrollbar-hide">
                    {message.items?.map((item, index) => (
                      <Card key={index} className="min-w-[200px] flex-shrink-0">
                        <div className="h-[120px] relative">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${item.image})` }}
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 rounded-full text-xs"
                            onClick={() => handleFoodMenuSelect(item.title)}
                          >
                            {item.action}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {message.type === "calendar" && (
                <div className="space-y-3">
                  <div className={cn("rounded-2xl px-4 py-2.5 text-sm bg-muted")}>
                    <p>{message.content}</p>
                    <div className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              )}
            </div>

            {message.sender === "user" && (
              <Avatar className="h-8 w-8 ml-2 mt-1">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {showCalendar && (
          <div className="mx-auto w-full max-w-sm">
            <BookingCalendar onConfirm={handleCalendarConfirm} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Image className="h-5 w-5 text-muted-foreground" />
          </Button>

          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="rounded-full border-muted bg-muted/50 focus-visible:ring-primary/30"
            disabled={isLoading}
          />

          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link href="/voice">
              <Mic className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>

          <Button variant="default" size="icon" className="rounded-full" onClick={handleSend} disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
            <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}


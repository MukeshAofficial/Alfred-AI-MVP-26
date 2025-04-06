"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const { signIn, profile, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectedFrom") || ""
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && profile) {
      console.log("User already authenticated with role:", profile.role)
      
      // If there's a redirectedFrom parameter in the URL and it's a vendor services page 
      // and the user is a vendor, we should redirect them there
      if (redirectTo && redirectTo.startsWith('/vendor/services') && profile.role === 'vendor') {
        console.log("Redirecting vendor to requested services page:", redirectTo);
        router.push(redirectTo);
        return;
      }
      
      // Otherwise, redirect based on role
      switch (profile.role) {
        case "guest":
          router.push("/explore")
          break
        case "admin":
          router.push("/admin/dashboard")
          break
        case "vendor":
          router.push("/vendor/dashboard")
          break
        default:
          router.push("/")
      }
    }
  }, [profile, authLoading, router, redirectTo])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error, success } = await signIn(email, password)

      if (error) {
        setError(error.message)
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (success) {
        toast({
          title: "Login successful",
          description: "You have been logged in successfully.",
        })
        
        // If there's a redirectedFrom parameter and it's a vendor services path,
        // we should manually redirect vendors there instead of relying on the auth context
        if (redirectTo && redirectTo.startsWith('/vendor/services')) {
          // We need to wait for the profile to be loaded before redirecting
          setTimeout(() => {
            console.log("Manual redirect to vendor services page:", redirectTo);
            router.push(redirectTo);
          }, 300);
        }
        // Otherwise, redirect will be handled by the auth context and middleware
      }
    } catch (err) {
      setError("An unexpected error occurred")
      toast({
        title: "Login failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // If still checking auth state, show loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If already logged in, the useEffect will handle redirect
  // This is just a fallback
  if (!authLoading && profile) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
          <CardDescription>Enter your email and password to sign in</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>
            {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Tabs defaultValue="guest" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="guest">Guest</TabsTrigger>
                <TabsTrigger value="hotel">Hotel</TabsTrigger>
                <TabsTrigger value="vendor">Vendor</TabsTrigger>
              </TabsList>
              <TabsContent value="guest" className="mt-2">
                <Link href="/guest/register">
                  <Button variant="outline" className="w-full">
                    Register as Guest
                  </Button>
                </Link>
              </TabsContent>
              <TabsContent value="hotel" className="mt-2">
                <Link href="/admin/pre-register">
                  <Button variant="outline" className="w-full">
                    Register as Hotel
                  </Button>
                </Link>
              </TabsContent>
              <TabsContent value="vendor" className="mt-2">
                <Link href="/vendor/pre-register">
                  <Button variant="outline" className="w-full">
                    Register as Vendor
                  </Button>
                </Link>
              </TabsContent>
            </Tabs>
          </div>
          <div className="text-center text-sm text-gray-500">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}


import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <ShieldAlert className="h-24 w-24 text-red-500 mb-6" />
      <h1 className="text-4xl font-bold tracking-tight">Access Denied</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        You don&apos;t have permission to access this page. Please sign in with the appropriate account.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  )
}


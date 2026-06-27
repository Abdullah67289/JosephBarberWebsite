import Link from "next/link";
import { Home, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-radial-spot px-4 text-center">
      <div>
        <p className="font-display text-8xl font-bold text-gold-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold">This page took a day off</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          The page you&apos;re looking for can&apos;t be found. Let&apos;s get you back to a fresh cut.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" /> Back home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/book">
              <CalendarCheck className="h-4 w-4" /> Book an appointment
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

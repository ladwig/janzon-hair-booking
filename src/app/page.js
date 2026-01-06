import Link from "next/link";
import { Button } from "@/components/ui/button";
import PublicBookingView from "@/components/PublicBookingView";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to <span className="text-blue-600">Janzon Hair</span>
        </h1>

        <p className="mt-3 text-2xl">
          Book your appointment with the best.
        </p>

        <div className="flex flex-wrap items-center justify-around max-w-4xl mt-6 sm:w-full">
          <Link href="/admin">
            <Button>Go to Admin</Button>
          </Link>
        </div>

        <PublicBookingView />
      </main>
    </div>
  );
}

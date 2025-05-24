import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ProtectedRoute({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") signIn();
    // Example: check for admin role
    if (status === "authenticated" && session?.user?.role !== "admin") {
      router.replace("/"); // or show an unauthorized page
    }
  }, [status, session, router]);

  if (status === "loading") return <div>Loading...</div>;
  if (!session || session?.user?.role !== "admin") return null;

  return children;
} 
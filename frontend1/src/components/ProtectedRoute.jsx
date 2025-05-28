import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    const isStaticAdmin = typeof window !== "undefined" && localStorage.getItem("isStaticAdmin") === "true";
    if (status === "unauthenticated" && !isStaticAdmin) {
      router.replace("/auth/login");
    }
    if (requireAdmin && status === "authenticated" && session?.user?.role !== "admin" && !isStaticAdmin) {
      router.replace("/");
    }
  }, [status, session, router, requireAdmin]);

  const isStaticAdmin = typeof window !== "undefined" && localStorage.getItem("isStaticAdmin") === "true";

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if ((!session && !isStaticAdmin) || (requireAdmin && session && session?.user?.role !== "admin" && !isStaticAdmin)) {
    return null;
  }

  return children;
} 
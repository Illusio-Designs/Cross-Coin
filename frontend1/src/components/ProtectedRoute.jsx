import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, checkAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Only redirect if we're sure the user is not authenticated
    if (!user && !loading) {
      // Check if we're already on the login page to avoid infinite redirects
      if (router.pathname !== "/auth/adminlogin") {
        router.replace("/auth/adminlogin");
      }
      return;
    }

    if (requireAdmin && user && user.role !== 'admin') {
      router.replace("/");
      return;
    }
  }, [loading, user, router, requireAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (user) {
    return children;
  }

  return null;
} 
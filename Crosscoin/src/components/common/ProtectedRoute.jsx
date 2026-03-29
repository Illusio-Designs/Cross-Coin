import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (router.pathname !== "/auth/adminlogin") {
        setRedirecting(true);
        router.replace("/auth/adminlogin");
      }
      return;
    }

    if (requireAdmin && user.role !== 'admin') {
      setRedirecting(true);
      router.replace("/");
    }
  }, [loading, user, router, requireAdmin]);

  // Show layout shell while loading auth or while redirect is in flight
  if (loading || redirecting) {
    return children;
  }

  if (user) {
    return children;
  }

  return null;
}

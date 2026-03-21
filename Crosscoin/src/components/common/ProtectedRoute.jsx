import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (router.pathname !== "/auth/adminlogin") {
        router.replace("/auth/adminlogin");
      }
      return;
    }

    if (requireAdmin && user.role !== 'admin') {
      router.replace("/");
    }
  }, [loading, user, router, requireAdmin]);

  // While loading, render children so the layout shell is visible
  // (sidebar, header, footer all mount immediately)
  if (loading) {
    return children;
  }

  if (user) {
    return children;
  }

  return null;
}

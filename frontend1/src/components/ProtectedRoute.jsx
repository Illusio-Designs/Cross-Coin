import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { userService } from "../services";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.replace("/auth/adminlogin");
          return;
        }

        const user = await userService.getCurrentUser();
        if (!user) {
          localStorage.removeItem('token');
          router.replace("/auth/adminlogin");
          return;
        }

        if (requireAdmin && user.role !== 'admin') {
          router.replace("/");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem('token');
        router.replace("/auth/adminlogin");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requireAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
} 
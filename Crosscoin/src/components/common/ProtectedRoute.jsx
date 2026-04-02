import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth, STAFF_ROLES } from "../../context/AuthContext";

// allowedRoles: array of roles that can access this route
// if omitted, any authenticated staff can access
export default function ProtectedRoute({ children, allowedRoles }) {
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

    // Must be a staff role to access dashboard
    if (!STAFF_ROLES.includes(user.role)) {
      setRedirecting(true);
      router.replace("/");
      return;
    }

    // If specific roles required, check them
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [loading, user, router, allowedRoles]);

  if (loading || redirecting) return children;
  if (user) return children;
  return null;
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth, STAFF_ROLES, getEffectiveRoles } from "../../context/AuthContext";

// allowedRoles: array of roles that can access this route
// if omitted, any authenticated staff can access
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (router.pathname !== "/login") {
        setRedirecting(true);
        router.replace("/login");
      }
      return;
    }

    const roles = getEffectiveRoles(user);

    // Must hold a staff role to access dashboard
    if (!roles.some((r) => STAFF_ROLES.includes(r))) {
      setRedirecting(true);
      router.replace("/");
      return;
    }

    // If specific roles required, the user needs at least one of them
    if (allowedRoles && !roles.some((r) => allowedRoles.includes(r))) {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [loading, user, router, allowedRoles]);

  if (loading || redirecting) return children;
  if (user) return children;
  return null;
}

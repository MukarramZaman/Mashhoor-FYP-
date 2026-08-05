import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: "business" | "influencer" | "admin";
}

function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== allowedRole) {
    // Redirect to their own dashboard if they're logged in as wrong role
    let redirectPath = "/";
    if (user?.role === "business") redirectPath = "/business-dashboard";
    else if (user?.role === "influencer") redirectPath = "/influencer-dashboard";
    else if (user?.role === "admin") redirectPath = "/admin/dashboard";

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;

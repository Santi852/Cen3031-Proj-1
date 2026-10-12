import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Wrap protected routes with this. Signed-out users go to /signin, and the
// page they asked for rides along in router state so sign-in can send them back.
export default function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

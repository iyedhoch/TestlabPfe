import { isAuthenticatedSelector } from "@/app/slices/authSlice";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoutes() {
  const isAuthenticated = useSelector(isAuthenticatedSelector);

  return isAuthenticated ? <Outlet /> : <Navigate to="/sign-in" />;
}

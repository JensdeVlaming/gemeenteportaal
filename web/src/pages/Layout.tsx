import AppHeader from "@/components/AppHeader";
import { Loader } from "@/components/Loader";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

export default function Layout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [loading, session, location.pathname, navigate]);

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-gray-50"
        role="status"
        aria-live="polite"
      >
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader />
      <div className="pt-4 px-4">
        <Outlet />
      </div>
    </div>
  );
}

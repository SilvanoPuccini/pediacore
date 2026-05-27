import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import type { User } from "@/types/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: User["role"];
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-dark border-t-transparent animate-spin" />
          <span className="text-[13px] text-ink2">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "@/components/Loader";
import { getStoredUser, refreshSession } from "@/lib/auth";

const ProtectedRoute = () => {
  const location = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedUser = getStoredUser();
      if (storedUser?.token) {
        if (isMounted) {
          setIsAuthenticated(true);
          setIsCheckingSession(false);
        }
        return;
      }

      const refreshedUser = await refreshSession();
      if (!isMounted) return;

      setIsAuthenticated(Boolean(refreshedUser?.token));
      setIsCheckingSession(false);
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingSession) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

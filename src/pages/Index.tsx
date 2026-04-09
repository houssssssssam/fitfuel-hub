import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Loader from "@/components/Loader";
import { getStoredUser, refreshSession } from "@/lib/auth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const routeUser = async () => {
      const storedUser = getStoredUser();
      if (storedUser?.token) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const refreshedUser = await refreshSession();
      if (!isMounted) return;

      navigate(refreshedUser?.token ? "/dashboard" : "/login", { replace: true });
    };

    void routeUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return <Loader />;
};

export default Index;

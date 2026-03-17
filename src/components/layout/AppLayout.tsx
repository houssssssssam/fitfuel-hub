import { Outlet, Navigate } from "react-router-dom";
import Header from "./Header";

const AppLayout = () => {
  const user = localStorage.getItem("user");

  // 🔐 PROTECT ALL ROUTES INSIDE THIS LAYOUT
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      <main className="container py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;

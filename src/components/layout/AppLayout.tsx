import { Outlet, Navigate } from "react-router-dom";
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ChatBot from "../ChatBot";
import PWAInstallPrompt from "../PWAInstallPrompt";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import KeyboardShortcutsModal from "../KeyboardShortcutsModal";

const AppLayout = () => {
  const userStr = localStorage.getItem("user");
  const { showShortcutsModal, setShowShortcutsModal } = useKeyboardShortcuts();
  
  // Track inverse state: sidebarOpen = true means expanded.
  const [sidebarOpen, setSidebarOpen] = useState(
    localStorage.getItem("fitfuel_sidebar_collapsed") === "true" ? false : true
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  const handleCollapse = (val: boolean) => {
    setSidebarOpen(!val);
    localStorage.setItem("fitfuel_sidebar_collapsed", String(val));
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      <Sidebar 
        isCollapsed={!sidebarOpen} 
        setCollapsed={handleCollapse}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />
      
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 w-full min-w-0
          ${sidebarOpen ? 'md:ml-60' : 'md:ml-16'}`}
      >
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      <ChatBot />
      <PWAInstallPrompt />
      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
    </div>
  );
};

export default AppLayout;

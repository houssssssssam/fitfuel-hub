import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useTheme } from "@/hooks/useTheme";
import { Switch } from "@/components/ui/switch";
import { Palette, Globe, Lock, Database, Info, Monitor, Moon, Sun, MonitorSmartphone, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const categories = [
  { id: "appearance", label: "appearance", icon: Palette },
  { id: "language", label: "languageRegion", icon: Globe },
  { id: "privacy", label: "privacySecurity", icon: Lock },
  { id: "data", label: "dataStorage", icon: Database },
  { id: "about", label: "about", icon: Info },
];

const SettingsToggle = ({ label, description, value, onChange }: any) => (
  <div className="flex items-center justify-between py-4 border-b border-border/50">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const SectionHeader = ({ title, description }: any) => (
  <div className="mb-6">
    <h2 className="text-xl font-semibold text-foreground tracking-tight">{title}</h2>
    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    <div className="h-px bg-border/50 mt-4" />
  </div>
);

export default function Settings() {
  const { t, i18n: i18nInstance } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("appearance");

  // State
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("accentColor") || "186 94% 42%");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [fontSize, setFontSize] = useState("Medium");

  // i18n
  const handleLang = (code: string) => {
    i18n.changeLanguage(code);
    i18nInstance.changeLanguage(code);
    localStorage.setItem("language", code);
    window.dispatchEvent(new Event("languagechange"));
  };

  // Appearance
  const handleAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem("accentColor", color);
    document.documentElement.style.setProperty("--primary", color);
  };

  // State: Privacy
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [delWait, setDelWait] = useState("");

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await api.post("/api/auth/change-password", {
        currentPassword,
        newPassword
      });
      toast.success("Password updated!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Error changing password");
    }
  };

  const handleDeleteAccount = async () => {
    if (delWait !== "DELETE") return toast.error("Type DELETE to confirm");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await api.delete(`/api/profile/${user.id}`);
      localStorage.clear();
      navigate("/login");
      toast.success("Account deleted");
    } catch (err: any) {
      toast.error("Error deleting account");
    }
  };

  const handleClearHistory = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Clear all nutrition history?")) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await api.delete(`/api/profile/${user.id}/history`);
      toast.success("History cleared");
    } catch (err) {
      toast.error("Failed to clear history");
    }
  };

  // Renderers
  const renderAppearance = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title={t('appearance')} description="Customize how FitFuel Hub looks on your device." />
      
      <div>
        <h3 className="text-sm font-medium mb-3">Theme Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: "light", icon: Sun, label: "Light" },
            { id: "dark", icon: Moon, label: "Dark" },
            { id: "system", icon: Monitor, label: "System" }
          ].map(tObj => (
            <button
              key={tObj.id}
              onClick={() => setTheme(tObj.id as any)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 transition-all ${theme === tObj.id ? 'border-primary bg-primary/10 glow-primary' : 'border-border/50 hover:border-primary/50 bg-card'}`}
            >
              <tObj.icon className={`h-8 w-8 ${theme === tObj.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-medium text-foreground">{tObj.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Accent Color</h3>
        <div className="flex flex-wrap gap-4">
          {[
             { name: "Cyan", val: "186 94% 42%", hex: "#06b6d4" },
             { name: "Teal", val: "171 77% 64%", hex: "#2dd4bf" },
             { name: "Purple", val: "271 91% 65%", hex: "#a855f7" },
             { name: "Orange", val: "24 100% 50%", hex: "#f97316" },
             { name: "Pink", val: "330 81% 60%", hex: "#ec4899" },
             { name: "Green", val: "142 71% 45%", hex: "#22c55e" },
             { name: "Blue", val: "217 91% 60%", hex: "#3b82f6" },
             { name: "Red", val: "0 84% 60%", hex: "#ef4444" }
          ].map(c => (
            <button
              key={c.name}
              onClick={() => handleAccent(c.val)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg ${accentColor === c.val ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderLanguage = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title={t('languageRegion')} description="Manage your language and display formats." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { code: "en", flag: "🇬🇧", name: "English" },
          { code: "fr", flag: "🇫🇷", name: "Français" },
          { code: "ar", flag: "🇸🇦", name: "العربية", disabled: true },
          { code: "es", flag: "🇪🇸", name: "Español", disabled: true }
        ].map(l => (
          <button
            key={l.code}
            disabled={l.disabled}
            onClick={() => handleLang(l.code)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${i18nInstance.language === l.code ? 'border-primary bg-primary/10' : 'border-border/50 bg-card hover:border-primary/50'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-2xl">{l.flag}</span>
            <span className="font-medium text-foreground">{l.name}</span>
            {l.disabled && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-secondary px-2 py-1 rounded text-muted-foreground">Soon</span>}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title={t('privacySecurity')} description="Update your password and manage account security." />
      
      <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-lg text-white">Change Password</h3>
        <input type="password" placeholder="Current Password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" />
        <input type="password" placeholder="New Password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" />
        <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full bg-background border border-border/50 rounded-lg h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white" />
        <button onClick={handleChangePassword} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto">Update Password</button>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-lg text-red-500 flex items-center gap-2">Danger Zone</h3>
        <p className="text-sm text-red-400">Permanently delete your account and all associated data.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Type DELETE to confirm" value={delWait} onChange={e=>setDelWait(e.target.value)} className="flex-1 bg-background border border-red-500/50 rounded-lg h-11 px-4 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-white" />
          <button onClick={handleDeleteAccount} className="bg-red-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-600 transition-colors h-11 flex items-center justify-center shrink-0">Delete Account</button>
        </div>
      </div>
    </div>
  );

  const renderData = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title={t('dataStorage')} description="Manage your data footprint and export your history." />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl text-left hover:border-primary/50 transition-colors group">
          <Database className="h-6 w-6 text-cyan-500 group-hover:scale-110 transition-transform" />
          <div>
            <div className="font-medium text-white">Export Nutrition (CSV)</div>
            <div className="text-xs text-muted-foreground mt-0.5">Download your full history</div>
          </div>
        </button>
        <button className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl text-left hover:border-primary/50 transition-colors group">
          <Dumbbell className="h-6 w-6 text-teal-500 group-hover:scale-110 transition-transform" />
          <div>
            <div className="font-medium text-white">Export Workouts (CSV)</div>
            <div className="text-xs text-muted-foreground mt-0.5">Save your training logs</div>
          </div>
        </button>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 mt-6">
         <h3 className="font-medium mb-4 text-white">Storage Usage</h3>
         <div className="space-y-4">
           <div className="flex justify-between text-sm"><span>Profile data</span><span className="text-muted-foreground font-mono">~2KB</span></div>
           <div className="flex justify-between text-sm"><span>Food logs</span><span className="text-muted-foreground font-mono">Active</span></div>
           <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
             <div className="h-full bg-gradient-to-r from-primary to-teal-500 w-[20%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"></div>
           </div>
         </div>
      </div>

      <div className="pt-4 flex">
        <button onClick={handleClearHistory} className="text-destructive text-sm font-medium hover:underline bg-destructive/10 px-4 py-2 rounded-lg transition-colors hover:bg-destructive/20 ml-auto">Clear all nutrition history</button>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionHeader title={t('about')} description="Information about FitFuel Hub." />
      
      <div className="flex flex-col items-center justify-center p-12 bg-card border border-border/50 rounded-2xl text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
        
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-xl shadow-primary/30 mb-6">
          <Dumbbell className="h-10 w-10 text-white" />
        </div>
        <h2 className="relative text-3xl font-extrabold tracking-tight text-white mb-2">FitFuel Hub</h2>
        <p className="relative text-primary font-medium mb-1 tracking-wider uppercase text-xs">Version 1.0.0</p>
        <p className="relative text-sm text-slate-400/80 mb-8 mt-2">Built with ❤️ using React + Node.js + AI Models</p>
        
        <div className="relative flex max-w-sm w-full gap-4 text-center justify-center">
          <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Terms of Service</button>
          <span className="text-border">•</span>
          <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Privacy Policy</button>
          <span className="text-border">•</span>
          <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Report Bug</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-auto min-h-[calc(100vh-6rem)] bg-background">
      {/* Sidebar (nested) */}
      <div className="w-full md:w-64 md:border-r border-border/40 p-2 md:p-6 md:pr-4 space-y-1 overflow-x-auto md:overflow-y-auto flex md:flex-col shrink-0 no-scrollbar relative z-10 border-b md:border-b-0 h-[68px] md:h-auto items-center md:items-stretch">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveSection(cat.id)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap md:whitespace-normal
                ${activeSection === cat.id 
                  ? 'bg-primary/10 text-primary font-medium glow-primary' 
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:block">{t(cat.label)}</span>
              <span className="md:hidden block capitalize">{cat.id}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar relative z-0">
        <div className="max-w-2xl">
          {activeSection === "appearance" && renderAppearance()}
          {activeSection === "language" && renderLanguage()}
          {activeSection === "privacy" && renderPrivacy()}
          {activeSection === "data" && renderData()}
          {activeSection === "about" && renderAbout()}
        </div>
      </div>
    </div>
  );
}

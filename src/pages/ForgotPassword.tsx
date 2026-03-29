import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dumbbell, Mail, Key, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");

    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setStep(2);
      toast.success("Recovery code sent to your email!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send recovery code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !newPassword) return toast.error("Please enter the code and a new password");
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { email, code, newPassword });
      setStep(3);
      toast.success("Password reset successfully!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 animate-fade-in relative z-10">
        
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] ring-1 ring-primary/20 ring-offset-4 ring-offset-slate-900">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">
            {step === 1 && "Recover Account"}
            {step === 2 && "Reset Password"}
            {step === 3 && "All Set!"}
          </h2>
          <p className="text-slate-400 text-sm">
            {step === 1 && "Enter your email address to receive a 6-digit recovery code."}
            {step === 2 && "Enter the 6-digit code sent to your email along with your new password."}
            {step === 3 && "Your password has been changed securely. Redirecting to login..."}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-primary h-12"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold group" disabled={loading}>
              {loading ? "Sending Code..." : "Send Recovery Code"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label className="text-slate-300">6-Digit Code</Label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-primary h-12 tracking-[0.5em] text-center font-mono text-xl"
                placeholder="------"
                maxLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">New Password</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-primary h-12"
                  placeholder="At least 6 characters"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="success" className="w-full h-12 text-base font-semibold group" disabled={loading}>
              {loading ? "Resetting..." : "Save New Password"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-6 animate-fade-in">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-slate-400 mb-6 font-medium">Auto-redirecting shortly...</p>
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Click here to login now
            </Link>
          </div>
        )}

        {step < 3 && (
          <div className="mt-8 text-center text-sm text-slate-400">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Decorative background elements matching Register/Login */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 bg-slate-950">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
      </div>
    </div>
  );
}

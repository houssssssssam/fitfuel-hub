import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import {
  AlertCircle,
  Bot,
  CheckCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LineChart,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Target,
  User,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type RegisterFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
};

type VerificationCode = [string, string, string, string, string, string];

type ApiErrorData = {
  message?: string;
};

const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(20)].map((_, i) => (
      <div
        key={i}
        className="absolute rounded-full bg-violet-300 transition-opacity"
        style={{
          width: Math.random() * 2 + 2 + "px",
          height: Math.random() * 2 + 2 + "px",
          top: Math.random() * 100 + "%",
          left: Math.random() * 100 + "%",
          opacity: Math.random() * 0.2 + 0.1,
          animation: `particle-float ${Math.random() * 15 + 10}s linear infinite`,
          animationDelay: `-${Math.random() * 10}s`,
        }}
      />
    ))}
  </div>
);

const getPasswordStrength = (pass: string) => {
  if (!pass) return { score: 0, label: "", color: "bg-transparent", text: "text-transparent" };
  if (pass.length < 6) return { score: 1, label: "Weak", color: "bg-slate-500", text: "text-slate-400" };

  let score = 2;
  if (pass.length >= 8 && /\d/.test(pass)) score = 3;
  if (pass.length >= 8 && /\d/.test(pass) && /[!@#$%^&*(),.?":{}|<>]/.test(pass)) score = 4;

  if (score === 2) return { score: 2, label: "Fair", color: "bg-red-500", text: "text-red-400" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-orange-500", text: "text-orange-400" };
  return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
};

const emptyVerificationCode = (): VerificationCode => ["", "", "", "", "", ""];

const Register = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreedToTerms: false,
  });
  const [verificationCode, setVerificationCode] = useState<VerificationCode>(emptyVerificationCode());
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const strength = getPasswordStrength(formData.password);

  const isEmailValid =
    formData.email.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
  const isPasswordMatch =
    formData.password !== "" &&
    formData.confirmPassword !== "" &&
    formData.password === formData.confirmPassword;
  const isPasswordMismatch =
    formData.confirmPassword !== "" && formData.password !== formData.confirmPassword;

  useEffect(() => {
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
      return () => window.clearTimeout(timer);
    }
  }, [countdown]);

  const setField = <K extends keyof RegisterFormData>(field: K, value: RegisterFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getApiMessage = (err: unknown, fallback: string): string => {
    if (err instanceof AxiosError<ApiErrorData>) {
      return err.response?.data?.message || fallback;
    }
    return fallback;
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) nextErrors.name = "Full name is required";
    if (!isEmailValid) nextErrors.email = "Valid email is required";
    if (formData.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (isPasswordMismatch) nextErrors.confirmPassword = "Passwords do not match";
    if (!formData.agreedToTerms) nextErrors.terms = "You must accept the terms of service";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateForm()) return;

    setSendingCode(true);
    setCodeError("");

    try {
      await api.post("/api/auth/send-verification", {
        email: formData.email.trim(),
      });

      setCodeSent(true);
      setStep(2);
      setCountdown(60);
      toast.success("Verification code sent! Check your inbox.");
    } catch (err) {
      const message = getApiMessage(err, "Failed to send code");
      toast.error(message);

      if (err instanceof AxiosError && err.response?.status === 409) {
        toast.error("This email is already registered. Sign in instead?");
      }
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    setSendingCode(true);

    try {
      await api.post("/api/auth/send-verification", {
        email: formData.email.trim(),
      });

      setCountdown(60);
      setVerificationCode(emptyVerificationCode());
      setCodeError("");
      toast.success("New code sent!");
    } catch (err) {
      toast.error(getApiMessage(err, "Failed to resend code"));
    } finally {
      setSendingCode(false);
    }
  };

  const handleCodeInput = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return;

    const nextCode = [...verificationCode] as VerificationCode;
    nextCode[index] = value;
    setVerificationCode(nextCode);
    setCodeError("");

    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus();
    }
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const nextCode = emptyVerificationCode();

    pasted.split("").forEach((char, index) => {
      if (index < 6) nextCode[index] = char;
    });

    setVerificationCode(nextCode);
    const lastIndex = Math.min(Math.max(pasted.length - 1, 0), 5);
    document.getElementById(`code-${lastIndex}`)?.focus();
  };

  const handleVerifyAndRegister = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) return;

    setVerifying(true);
    setCodeError("");

    try {
      await api.post("/api/auth/verify-code", {
        email: formData.email.trim(),
        code,
      });

      setVerifying(false);
      setRegistering(true);

      const res = await api.post("/api/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: res.data.user.id,
          name: res.data.user.name,
          email: res.data.user.email,
          token: res.data.token,
        })
      );

      toast.success(`Welcome to FitFuel Hub, ${res.data.user.name}!`);
      navigate("/onboarding");
    } catch (err) {
      const message = getApiMessage(err, "Verification failed");
      setCodeError(message);

      if (err instanceof AxiosError && err.response?.status === 429) {
        setVerificationCode(emptyVerificationCode());
        setCodeSent(false);
        setStep(1);
      }
    } finally {
      setVerifying(false);
      setRegistering(false);
    }
  };

  const resetVerificationFlow = () => {
    setCodeSent(false);
    setStep(1);
    setVerificationCode(emptyVerificationCode());
    setCodeError("");
    setCountdown(0);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0f1e] overflow-hidden selection:bg-violet-500/30">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        @keyframes particle-float {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in-right {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .anim-fade-in-right { animation: fade-in-right 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-up-1 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
        .anim-slide-up-2 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
        .anim-slide-up-3 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
        .anim-slide-up-4 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards; opacity: 0; }
        .anim-slide-up-5 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        .anim-slide-up-6 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; opacity: 0; }

        .glow-input:focus-within {
          box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.5), 0 0 15px -3px rgba(124, 58, 237, 0.3);
          border-color: rgba(124, 58, 237, 0.5);
        }
        .glow-input-error {
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.5), 0 0 15px -3px rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .orb-purple { animation: float 14s ease-in-out infinite, pulse-glow 9s ease-in-out infinite; }
        .orb-indigo { animation: float 18s ease-in-out infinite reverse, pulse-glow 11s ease-in-out infinite; }
        .orb-teal { animation: float 22s ease-in-out infinite, pulse-glow 13s ease-in-out infinite; }
      `}</style>

      <div className="w-full lg:w-[45%] bg-[#0f1629] flex flex-col justify-center items-center p-6 relative z-20 min-h-screen lg:rounded-r-3xl lg:shadow-[20px_0_50px_rgba(0,0,0,0.5)] border-r border-white/5 order-2 lg:order-1">
        <div className="absolute top-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl lg:hidden pointer-events-none" />

        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="w-full mb-8 text-center lg:text-left anim-slide-up-1">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-400 mb-2 tracking-wide">
              {step === 1 ? "Start free, stay fit." : "Almost there."}
            </p>
            <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
              {step === 1 ? "Create account" : "Verify your email"}
            </h2>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mt-3">Step {step} of 2</p>
            <div className="h-px w-10 bg-gradient-to-r from-violet-500 to-transparent mt-4 opacity-50 mx-auto lg:mx-0" />
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 w-full">
            <div className="space-y-1.5 anim-slide-up-2">
              <Label htmlFor="name" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1">
                Full Name
              </Label>
              <div className={`relative glow-input rounded-xl transition-all duration-300 border bg-white/5 h-12 flex items-center ${errors.name ? "glow-input-error" : "border-white/10"}`}>
                <User className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => {
                    setField("name", e.target.value);
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className="pl-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={codeSent || sendingCode || verifying || registering}
                />
              </div>
              {errors.name && <p className="text-[11px] text-red-400 ml-1 animate-in fade-in">{errors.name}</p>}
            </div>

            <div className="space-y-1.5 anim-slide-up-3">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1">
                Email
              </Label>
              <div className={`relative glow-input rounded-xl transition-all duration-300 border bg-white/5 h-12 flex items-center ${errors.email ? "glow-input-error" : "border-white/10"}`}>
                <Mail className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setField("email", e.target.value);
                    setErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  className="pl-11 pr-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={codeSent || sendingCode || verifying || registering}
                />
                {isEmailValid && <CheckCircle2 className="absolute right-3.5 h-5 w-5 text-emerald-500 pointer-events-none animate-in zoom-in" />}
              </div>
              {errors.email && <p className="text-[11px] text-red-400 ml-1 animate-in fade-in">{errors.email}</p>}
            </div>

            <div className="space-y-1.5 anim-slide-up-4">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1">
                Password
              </Label>
              <div className={`relative glow-input rounded-xl transition-all duration-300 border bg-white/5 h-12 flex items-center mb-1.5 ${errors.password ? "glow-input-error" : "border-white/10"}`}>
                <Lock className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => {
                    setField("password", e.target.value);
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className="pl-11 pr-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={codeSent || sendingCode || verifying || registering}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 h-full flex items-center text-slate-500 hover:text-white transition-colors"
                  disabled={sendingCode || verifying || registering}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 flex gap-1 h-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-full flex-1 rounded-full transition-all duration-500 ${strength.score >= level ? strength.color : "bg-white/10"}`}
                    />
                  ))}
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider w-12 text-right transition-colors duration-300 ${strength.text}`}>
                  {strength.label || "None"}
                </span>
              </div>
              {errors.password && <p className="text-[11px] text-red-400 ml-1 mt-1 animate-in fade-in">{errors.password}</p>}
            </div>

            <div className="space-y-1.5 anim-slide-up-5 mt-1">
              <Label htmlFor="confirmPassword" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1">
                Confirm Password
              </Label>
              <div className={`relative glow-input rounded-xl transition-all duration-300 border bg-white/5 h-12 flex items-center ${errors.confirmPassword ? "glow-input-error" : "border-white/10"}`}>
                <Lock className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setField("confirmPassword", e.target.value);
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  className="pl-11 pr-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={codeSent || sendingCode || verifying || registering}
                />
                {isPasswordMatch && <CheckCircle2 className="absolute right-3.5 h-5 w-5 text-emerald-500 pointer-events-none animate-in zoom-in" />}
                {isPasswordMismatch && <XCircle className="absolute right-3.5 h-5 w-5 text-red-500 pointer-events-none animate-in zoom-in" />}
              </div>
              {errors.confirmPassword && <p className="text-[11px] text-red-400 ml-1 animate-in fade-in">{errors.confirmPassword}</p>}
            </div>

            <div className="pt-2 anim-slide-up-6">
              <label className="flex items-start gap-2.5 text-slate-400 cursor-pointer hover:text-slate-200 transition-colors group">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => {
                      setField("agreedToTerms", e.target.checked);
                      setErrors((prev) => ({ ...prev, terms: "" }));
                    }}
                    className="peer appearance-none w-4 h-4 border border-white/20 rounded-sm bg-white/5 checked:bg-violet-500 checked:border-violet-500 transition-all cursor-pointer"
                    disabled={codeSent || sendingCode || verifying || registering}
                  />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-[12px] leading-relaxed select-none">
                  I agree to the <a href="#" className="text-violet-400 hover:text-violet-300 hover:underline">Terms of Service</a> and <a href="#" className="text-violet-400 hover:text-violet-300 hover:underline">Privacy Policy</a>
                </span>
              </label>
              {errors.terms && <p className="text-[11px] text-red-400 ml-6 mt-1 animate-in fade-in">{errors.terms}</p>}
            </div>

            <div className="pt-3 anim-slide-up-6">
              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={
                    sendingCode ||
                    !formData.name ||
                    !formData.email ||
                    !formData.password ||
                    !formData.confirmPassword ||
                    !formData.agreedToTerms
                  }
                  className="group relative w-full h-[52px] flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-[15px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {sendingCode ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Verification Code
                    </span>
                  )}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    <p className="text-sm text-green-400">
                      Code sent to <strong>{formData.email}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="mb-3 block text-[11px] uppercase tracking-widest font-semibold text-slate-400 ml-1">
                      Enter 6-digit code
                    </label>
                    <div className="flex gap-2 justify-between">
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          id={`code-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleCodeInput(e.target.value, index)}
                          onKeyDown={(e) => handleCodeKeyDown(e, index)}
                          onPaste={handleCodePaste}
                          className={`h-12 w-12 rounded-xl border text-center text-xl font-bold text-white outline-none transition-all duration-200 ${
                            codeError
                              ? "border-red-500/50 bg-red-500/5"
                              : digit
                                ? "border-primary bg-primary/10"
                                : "border-white/10 bg-white/5 focus:border-primary/50"
                          }`}
                          disabled={verifying || registering}
                        />
                      ))}
                    </div>

                    {codeError && (
                      <p className="mt-2 flex items-center gap-1 text-[11px] text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        {codeError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {countdown > 0 ? `Resend in ${countdown}s` : "Didn't receive the code?"}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={countdown > 0 || sendingCode || verifying || registering}
                      className="text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                    >
                      {sendingCode ? "Sending..." : "Resend code"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyAndRegister}
                    disabled={verificationCode.join("").length !== 6 || verifying || registering}
                    className="group relative w-full h-[52px] flex items-center justify-center bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-semibold text-[15px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {verifying || registering ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {registering ? "Creating your account..." : "Verifying code..."}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Verify & Create Account
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={resetVerificationFlow}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    disabled={sendingCode || verifying || registering}
                  >
                    ← Use a different email
                  </button>
                </div>
              )}
            </div>

            <div className="text-center pt-5 anim-slide-up-6">
              <p className="text-[13px] text-slate-400">
                Already have an account?{" "}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-semibold transition-colors ml-1">
                  Sign in &rarr;
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-center px-16 xl:px-24 overflow-hidden bg-[#0a0f1e] anim-fade-in-right order-1 lg:order-2">
        <div className="orb-purple absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-violet-600 rounded-full blur-3xl opacity-20 pointer-events-none mix-blend-screen" />
        <div className="orb-indigo absolute bottom-[10%] left-[5%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-3xl opacity-15 pointer-events-none mix-blend-screen" />
        <div className="orb-teal absolute top-[50%] left-[30%] w-[400px] h-[400px] bg-teal-500 rounded-full blur-3xl opacity-10 pointer-events-none mix-blend-screen" />

        <Particles />

        <div className="relative z-10 w-full max-w-2xl h-full flex flex-col py-24 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FitFuel Hub</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Start your journey
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">today.</span>
            </h1>

            <p className="text-lg text-slate-400 max-w-md mb-12 leading-relaxed">
              Transform your lifestyle with data-driven insights and AI personalization designed precisely for your exact physical traits.
            </p>

            <div className="space-y-4">
              {[
                { icon: Target, title: "Personalized", text: "Macro targets calculated for your exact body." },
                { icon: Bot, title: "AI-Powered", text: "Smart meal plans that adapt directly to your specific goals." },
                { icon: LineChart, title: "Progressive", text: "Track improvements efficiently week over week." },
              ].map((feature, idx) => (
                <div key={idx} className="flex p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors shadow-xl shadow-black/20 group">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl bg-violet-500/10 text-violet-400 mr-5 group-hover:scale-110 group-hover:bg-violet-500/20 transition-all">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1 tracking-wide">{feature.title}</h3>
                    <p className="text-slate-400 text-[14px] leading-relaxed">{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

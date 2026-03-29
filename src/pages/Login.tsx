import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Animations & Effects ───────────────────────────────────────────────────
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {[...Array(20)].map((_, i) => (
      <div 
        key={i} 
        className="absolute rounded-full bg-white transition-opacity"
        style={{
          width: Math.random() * 2 + 2 + "px",
          height: Math.random() * 2 + 2 + "px",
          top: Math.random() * 100 + "%",
          left: Math.random() * 100 + "%",
          opacity: Math.random() * 0.2 + 0.2,
          animation: `particle-float ${Math.random() * 12 + 8}s linear infinite`,
          animationDelay: `-${Math.random() * 10}s`
        }}
      />
    ))}
  </div>
);

const quotes = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Take care of your body. It's the only place you have to live.",
  "Fitness is not about being better than someone else. It's about being better than you used to be.",
  "The hardest lift of all is lifting your butt off the couch.",
];

const QuoteCarousel = () => {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % quotes.length);
        setFade(true);
      }, 500); 
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-auto relative h-24 flex items-center z-10 w-full max-w-lg overflow-hidden">
      <p className={`text-lg md:text-xl font-medium italic text-slate-300 transition-opacity duration-500 leading-relaxed ${fade ? 'opacity-100' : 'opacity-0'}`}>
        "{quotes[index]}"
      </p>
    </div>
  );
};

const NumberCounter = ({ end, suffix, label }: { end: number, suffix: string, label: string }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);

  return (
    <div className="flex flex-col">
      <div className="text-3xl md:text-4xl font-bold text-white mb-1">
        {count === end ? end : count}{suffix}
      </div>
      <div className="text-sm tracking-wide text-slate-400 font-medium uppercase">{label}</div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const userData = { ...res.data.user, token: res.data.token };
      localStorage.setItem("user", JSON.stringify(userData));
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0a0f1e] overflow-hidden selection:bg-cyan-500/30">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        @keyframes fade-in-left {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .anim-fade-in-left { animation: fade-in-left 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-up-1 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards; opacity: 0; }
        .anim-slide-up-2 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }
        .anim-slide-up-3 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        .anim-slide-up-4 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards; opacity: 0; }
        .anim-slide-up-5 { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; opacity: 0; }
        
        .glow-input:focus-within {
          box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.5), 0 0 15px -3px rgba(6, 182, 212, 0.3);
          border-color: rgba(6, 182, 212, 0.5);
        }
        
        .orb-1 { animation: float 12s ease-in-out infinite, pulse-glow 8s ease-in-out infinite; }
        .orb-2 { animation: float 15s ease-in-out infinite reverse, pulse-glow 10s ease-in-out infinite; }
        .orb-3 { animation: spin-slow 25s linear infinite, pulse-glow 12s ease-in-out infinite; }
      `}</style>

      {/* ─── LEFT PANEL (Visual) ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-center px-16 xl:px-24 overflow-hidden bg-[#0a0f1e] anim-fade-in-left">
        {/* Dynamic Orbs */}
        <div className="orb-1 absolute top-[10%] left-[10%] w-[500px] h-[500px] bg-cyan-500 rounded-full blur-3xl opacity-20 pointer-events-none mix-blend-screen" />
        <div className="orb-2 absolute bottom-[5%] right-[5%] w-[600px] h-[600px] bg-teal-600 rounded-full blur-3xl opacity-15 pointer-events-none mix-blend-screen" />
        <div className="orb-3 absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-indigo-500 rounded-full blur-3xl opacity-15 pointer-events-none mix-blend-screen" />
        
        <Particles />

        <div className="relative z-10 w-full max-w-2xl h-full flex flex-col py-24 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/20">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">FitFuel Hub</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Transform your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">body & mind.</span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-md mb-12 leading-relaxed">
              Join thousands of athletes tracking their nutrition and workouts with AI-powered precision.
            </p>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-8 mb-12">
              <NumberCounter end={100} suffix="K+" label="Foods" />
              <div className="flex flex-col">
                <div className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-indigo-400 mb-1">AI</div>
                <div className="text-sm tracking-wide text-slate-400 font-medium uppercase">Insights</div>
              </div>
              <div className="flex flex-col">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">Free</div>
                <div className="text-sm tracking-wide text-slate-400 font-medium uppercase">Always</div>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              {[
                "Real-time macro tracking",
                "AI meal suggestions",
                "Workout planning",
                "Progress analytics"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-200 font-medium text-[15px]">
                  <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <QuoteCarousel />
        </div>
      </div>

      {/* ─── RIGHT PANEL (Form) ────────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] bg-[#0f1629] flex flex-col items-center justify-center min-h-screen relative z-20 lg:rounded-l-3xl lg:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-white/5">
        
        {/* Mobile background glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl lg:hidden pointer-events-none" />
        
        <div className="w-full max-w-md px-10">
          
          <div className="w-full mb-12 text-center lg:text-left anim-slide-up-1">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 shadow-lg shadow-cyan-500/20">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-cyan-400 font-medium text-sm tracking-widest uppercase mb-2">
              Welcome back
            </p>
            <h1 className="text-4xl font-bold text-white">
              Sign in to FitFuel
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Track your nutrition and crush your goals
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            
            <div className="space-y-2 anim-slide-up-2">
              <Label htmlFor="email" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1 mb-2 block">Email</Label>
              <div className="relative glow-input rounded-2xl transition-all duration-300 border border-white/10 bg-white/5 h-[56px] flex items-center">
                <Mail className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2 anim-slide-up-3">
              <Label htmlFor="password" className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 ml-1 mb-2 block">Password</Label>
              <div className="relative glow-input rounded-2xl transition-all duration-300 border border-white/10 bg-white/5 h-[56px] flex items-center">
                <Lock className="absolute left-3.5 h-5 w-5 text-slate-500 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-full w-full bg-transparent border-0 text-white placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 h-full flex items-center text-slate-500 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] anim-slide-up-4 pt-1">
              <label className="flex items-center gap-2.5 text-slate-400 cursor-pointer hover:text-slate-200 transition-colors group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-4 h-4 border border-white/20 rounded-sm bg-white/5 checked:bg-cyan-500 checked:border-cyan-500 transition-all cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="select-none">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium">
                Forgot password?
              </Link>
            </div>

            <div className="mt-6 anim-slide-up-5">
              <button 
                type="submit" 
                disabled={loading}
                className="group relative w-full h-[56px] flex items-center justify-center bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-[15px] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
            
            <div className="text-center mt-8 anim-slide-up-5">
              <p className="text-[13px] text-slate-400">
                New to FitFuel?{" "}
                <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors ml-1">
                  Create account &rarr;
                </Link>
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Dumbbell, Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Register = () => {
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // reset all messages
  setEmailError("");
  setPasswordError("");
  setGeneralError("");
  setSuccess("");

  // password check (FRONTEND)
  if (formData.password !== formData.confirmPassword) {
    setPasswordError("Passwords do not match");
    return;
  }

  try {
    await api.post("/api/auth/register", {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    setSuccess("Account created successfully. Redirecting to login...");

    setTimeout(() => {
      navigate("/login");
    }, 1500);
  } catch (err: any) {
    const message = err.response?.data?.message;

    if (message === "User already exists") {
      setEmailError("Email already exists");
    } else {
      setGeneralError("Registration failed");
    }
  }
};




  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            Create Account
          </h1>
          <p className="text-muted-foreground mt-2">
            Start your fitness transformation today
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="stat-card space-y-6">
          {generalError && (
  <p className="text-sm text-red-500 text-center">
    {generalError}
  </p>
)}
{success && (
  <p className="text-sm text-green-500 text-center">
    {success}
  </p>
)}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border"
                />
{emailError && (
  <p className="text-sm text-red-500 mt-1">
    {emailError}
  </p>
)}


              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 bg-secondary border-border"
                />

                  {success && (
                    <p className="text-sm text-green-500 text-center">
                      {success}
                    </p>
                  )}

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="pl-10 bg-secondary border-border"
                />
                {passwordError && (
  <p className="text-sm text-red-500 mt-1">
    {passwordError}
  </p>
)}

              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="mt-1 rounded border-border" />
            <span>
              I agree to the{" "}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </span>
          </div>

          <Button type="submit" variant="gradient" size="lg" className="w-full">
            Create Account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;

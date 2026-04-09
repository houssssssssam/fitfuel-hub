const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * Password strength validation
 * Requires: 8+ chars, at least 1 uppercase, 1 lowercase, 1 number
 */
const isStrongPassword = (pw) =>
  typeof pw === "string" &&
  pw.length >= 8 &&
  /[A-Z]/.test(pw) &&
  /[a-z]/.test(pw) &&
  /[0-9]/.test(pw);

const PASSWORD_REQUIREMENTS =
  "Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a number.";
const verificationCodes = new Map();
const REFRESH_TOKEN_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const getRefreshTokenCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,              // HTTPS only in production
    sameSite: isProduction ? "none" : "lax", // "none" required for cross-origin (Vercel → Render)
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    path: "/",
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(key);
    }
  }
}, 10 * 60 * 1000);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

/**
 * REGISTER
 * POST /api/auth/register
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    const verifiedKey = `verified_${normalizedEmail}`;
    const isVerified = verificationCodes.get(verifiedKey);

    if (!isVerified || !isVerified.verified || Date.now() > isVerified.expiresAt) {
      return res.status(403).json({
        message: "Email not verified. Please complete verification first."
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    await user.save();
    verificationCodes.delete(verifiedKey);

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/send-verification", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered. Please sign in."
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt,
      attempts: 0,
    });

    verificationCodes.delete(`verified_${normalizedEmail}`);

    const mailOptions = {
      from: `"FitFuel Hub" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: "Your FitFuel Hub Verification Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#0a0f1e;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background:#0f1629;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;max-width:500px;width:100%;">
                  <tr>
                    <td style="background:linear-gradient(135deg,#06b6d4,#0d9488);padding:32px;text-align:center;">
                      <h1 style="color:white;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">FitFuel Hub</h1>
                      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Your complete fitness companion</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px 32px;">
                      <h2 style="color:#f8fafc;margin:0 0 12px;font-size:20px;">Verify your email</h2>
                      <p style="color:#94a3b8;margin:0 0 32px;font-size:15px;line-height:1.6;">
                        Use the code below to verify your email address and complete your FitFuel Hub registration.
                      </p>
                      <div style="background:#141d35;border:2px solid #06b6d4;border-radius:12px;padding:24px;text-align:center;margin:0 0 32px;">
                        <p style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">
                          Verification Code
                        </p>
                        <p style="color:#06b6d4;font-size:42px;font-weight:800;letter-spacing:12px;margin:0;font-family:monospace;">
                          ${code}
                        </p>
                      </div>
                      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">
                        This code expires in <strong style="color:#94a3b8;">10 minutes</strong>
                      </p>
                      <p style="color:#64748b;font-size:13px;margin:0;">
                        If you didn't request this, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                      <p style="color:#475569;font-size:12px;margin:0;">
                        © 2025 FitFuel Hub. Made for fitness enthusiasts.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailErr) {
      verificationCodes.delete(normalizedEmail);
      console.error("Email send failed:", emailErr.message);
      return res.status(422).json({
        message: "Could not send email. Please check the address and try again."
      });
    }

    res.json({
      message: "Verification code sent! Check your inbox.",
      expiresIn: 600
    });
  } catch (err) {
    console.error("Send verification error:", err);
    res.status(500).json({ message: "Failed to send verification code" });
  }
});

router.post("/verify-code", (req, res) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !code) {
      return res.status(400).json({ message: "Email and code required" });
    }

    const stored = verificationCodes.get(normalizedEmail);
    if (!stored) {
      return res.status(400).json({
        message: "No verification code found. Please request a new one."
      });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(normalizedEmail);
      return res.status(400).json({
        message: "Code expired. Please request a new one."
      });
    }

    stored.attempts = (stored.attempts || 0) + 1;
    if (stored.attempts > 5) {
      verificationCodes.delete(normalizedEmail);
      return res.status(429).json({
        message: "Too many attempts. Please request a new code."
      });
    }

    if (stored.code !== code.toString()) {
      const remaining = 5 - stored.attempts;
      return res.status(400).json({
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
      });
    }

    verificationCodes.delete(normalizedEmail);
    verificationCodes.set(`verified_${normalizedEmail}`, {
      verified: true,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    res.json({ message: "Email verified successfully!" });
  } catch (err) {
    console.error("Verify code error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

/**
 * LOGIN
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    res.json({
      message: "Login successful",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Return success anyway to prevent email enumeration
      return res.json({ message: "If an account exists, a reset code has been sent." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = code;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Reset your FitFuel Hub password",
      html: `
        <div style="background-color: #0f172a; padding: 40px; font-family: sans-serif; color: #f8fafc; border-radius: 12px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #06b6d4; margin-top: 0;">FitFuel Hub Password Reset</h2>
          <p>You requested a password reset. Your 6-digit recovery code is:</p>
          <div style="background-color: #1e293b; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 12px; text-align: center; border-radius: 8px; margin: 30px 0; border: 1px solid #334155;">
            ${code}
          </div>
          <p>This code will expire in exactly 1 hour. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error("Email send failed:", error);
      }
    });

    res.json({ message: "Reset code sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ 
      email,
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId; // from JWT — not from body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_REQUIREMENTS });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * REFRESH TOKEN
 * POST /api/auth/refresh
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const newAccessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

    res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());

    res.json({
      token: newAccessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

/**
 * LOGOUT
 * POST /api/auth/logout
 */
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
  res.json({ message: "Logged out successfully" });
});

module.exports = router;

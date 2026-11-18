const express = require("express");
const User = require("../models/User");
const {
  isConfigured,
  publicKey,
  isValidTimezone,
  timeToMinutes,
  sendToSubscriptions,
  removeExpiredSubscriptions,
} = require("../utils/notifications");

const router = express.Router();

const formatSettings = (user) => ({
  ...(user.notificationSettings?.toObject?.() || user.notificationSettings || {}),
  deviceCount: user.pushSubscriptions?.length || 0,
});

// GET /api/notifications/config — whether push is available + the public key
router.get("/config", (req, res) => {
  res.json({ available: isConfigured, publicKey: isConfigured ? publicKey : null });
});

// GET /api/notifications/settings
router.get("/settings", async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("notificationSettings pushSubscriptions");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatSettings(user));
  } catch (error) {
    console.error("Get notification settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/notifications/settings — reminder toggles and meal times
router.put("/settings", async (req, res) => {
  try {
    const body = req.body || {};
    const update = {};

    if (typeof body.enabled === "boolean") update["notificationSettings.enabled"] = body.enabled;
    if (typeof body.water === "boolean") update["notificationSettings.water"] = body.water;
    if (typeof body.streak === "boolean") update["notificationSettings.streak"] = body.streak;
    if (typeof body.timezone === "string" && isValidTimezone(body.timezone)) {
      update["notificationSettings.timezone"] = body.timezone;
    }
    if (body.meals && typeof body.meals === "object") {
      if (typeof body.meals.enabled === "boolean") update["notificationSettings.meals.enabled"] = body.meals.enabled;
      for (const slot of ["breakfast", "lunch", "dinner"]) {
        if (body.meals[slot] !== undefined) {
          if (timeToMinutes(body.meals[slot]) === null) {
            return res.status(400).json({ message: `Invalid ${slot} time. Use HH:MM.` });
          }
          update[`notificationSettings.meals.${slot}`] = body.meals[slot];
        }
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true })
      .select("notificationSettings pushSubscriptions");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(formatSettings(user));
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/notifications/subscribe — register this browser/device
router.post("/subscribe", async (req, res) => {
  try {
    if (!isConfigured) return res.status(503).json({ message: "Notifications are not configured on the server" });

    const subscription = req.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }
    if (typeof subscription.endpoint !== "string" || !subscription.endpoint.startsWith("https://")) {
      return res.status(400).json({ message: "Invalid subscription endpoint" });
    }

    const user = await User.findById(req.userId).select("notificationSettings pushSubscriptions");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pushSubscriptions = (user.pushSubscriptions || []).filter((sub) => sub.endpoint !== subscription.endpoint);
    user.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
    user.pushSubscriptions = user.pushSubscriptions.slice(-10); // at most 10 devices
    user.notificationSettings.enabled = true;
    if (typeof req.body?.timezone === "string" && isValidTimezone(req.body.timezone)) {
      user.notificationSettings.timezone = req.body.timezone;
    }
    await user.save();

    res.json(formatSettings(user));
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/notifications/unsubscribe — remove this browser/device
router.post("/unsubscribe", async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    const user = await User.findById(req.userId).select("notificationSettings pushSubscriptions");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.pushSubscriptions = (user.pushSubscriptions || []).filter((sub) => sub.endpoint !== endpoint);
    if (user.pushSubscriptions.length === 0) user.notificationSettings.enabled = false;
    await user.save();

    res.json(formatSettings(user));
  } catch (error) {
    console.error("Unsubscribe error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/notifications/test — send a test notification to all devices
router.post("/test", async (req, res) => {
  try {
    if (!isConfigured) return res.status(503).json({ message: "Notifications are not configured on the server" });

    const user = await User.findById(req.userId).select("pushSubscriptions");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.pushSubscriptions?.length) {
      return res.status(400).json({ message: "No device is subscribed yet" });
    }

    const { delivered, expired } = await sendToSubscriptions(user.pushSubscriptions, {
      title: "FitFuel Hub notifications are on ✅",
      body: "You'll get reminders for meals, water and your streak.",
      url: "/settings",
      tag: "test",
    });
    await removeExpiredSubscriptions(user._id, expired);

    if (delivered === 0) return res.status(502).json({ message: "Couldn't deliver the test notification" });
    res.json({ delivered });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

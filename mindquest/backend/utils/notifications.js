/**
 * Web push reminders: meal logging, water and streak protection.
 *
 * Reminders are checked every 5 minutes in each user's own timezone. Each
 * reminder fires at most once per local day and only when it is still useful
 * (no food logged for that meal yet, water behind schedule, streak at risk).
 *
 * Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (and optionally VAPID_SUBJECT).
 */
const webpush = require("web-push");
const User = require("../models/User");

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_WINDOW_MINUTES = 60; // a reminder can still go out up to 1 h after its time
const WATER_GOAL_ML = 2500; // same goal as the dashboard hydration card
const WATER_CHECKPOINTS = [
  { key: "water_1", time: "11:00", share: 0.25 },
  { key: "water_2", time: "15:00", share: 0.5 },
  { key: "water_3", time: "18:30", share: 0.75 },
];
const STREAK_TIME = "21:00";
const MEAL_SLOTS = ["breakfast", "lunch", "dinner"];

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const isConfigured = Boolean(publicKey && privateKey);

if (isConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${process.env.EMAIL_USER || "admin@fitfuel.app"}`,
    publicKey,
    privateKey,
  );
}

const isValidTimezone = (timezone) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const timeToMinutes = (time) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/** Local date (YYYY-MM-DD) and minutes since midnight in the given timezone. */
const getLocalNow = (timezone, now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: isValidTimezone(timezone) ? timezone : "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const isInWindow = (localMinutes, time) => {
  const target = timeToMinutes(time);
  return target !== null && localMinutes >= target && localMinutes < target + REMINDER_WINDOW_MINUTES;
};

/**
 * Pure function: which reminders should go out for this user right now.
 * The app tracks "today" by UTC date (lastResetDate), so intake is read the same way.
 */
const computeDueReminders = (user, now = new Date()) => {
  const settings = user.notificationSettings || {};
  if (!settings.enabled) return [];

  const local = getLocalNow(settings.timezone, now);
  const appToday = now.toISOString().split("T")[0];
  const isAppToday = user.lastResetDate === appToday;
  const foodsToday = isAppToday ? user.foods || [] : [];
  const waterToday = isAppToday ? user.dailyWater || 0 : 0;
  const log = user.notificationLog instanceof Map
    ? Object.fromEntries(user.notificationLog)
    : user.notificationLog || {};
  const alreadySent = (key) => log[key] === local.date;
  const due = [];

  if (settings.meals?.enabled !== false) {
    for (const slot of MEAL_SLOTS) {
      const key = `meal_${slot}`;
      const loggedSlot = foodsToday.some((food) => (food.mealType || "").toLowerCase().includes(slot));
      if (!alreadySent(key) && !loggedSlot && isInWindow(local.minutes, settings.meals?.[slot])) {
        due.push({
          key,
          title: `Time to log your ${slot} 🍽️`,
          body: "Snap a photo or tell FuelBot what you ate. It takes 10 seconds.",
          url: "/food-tracking",
        });
      }
    }
  }

  if (settings.water !== false) {
    for (const checkpoint of WATER_CHECKPOINTS) {
      const expected = WATER_GOAL_ML * checkpoint.share;
      if (!alreadySent(checkpoint.key) && waterToday < expected && isInWindow(local.minutes, checkpoint.time)) {
        due.push({
          key: checkpoint.key,
          title: "Hydration check 💧",
          body: `You're at ${waterToday} ml. Aim for about ${expected} ml by now. Grab a glass of water!`,
          url: "/dashboard",
        });
        break; // one water reminder at a time
      }
    }
  }

  if (settings.streak !== false) {
    const streak = user.currentStreak || 0;
    const loggedToday = user.lastLoggedDate === appToday;
    if (streak > 0 && !loggedToday && !alreadySent("streak") && isInWindow(local.minutes, STREAK_TIME)) {
      due.push({
        key: "streak",
        title: `Your ${streak}-day streak ends tonight 🔥`,
        body: "Log anything you ate today to keep it alive.",
        url: "/food-tracking",
      });
    }
  }

  return due.map((reminder) => ({ ...reminder, localDate: local.date }));
};

/** Sends a payload to every device of a user. Returns the endpoints that no longer exist. */
const sendToSubscriptions = async (subscriptions, payload) => {
  const expired = [];
  let delivered = 0;

  await Promise.all(
    (subscriptions || []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        );
        delivered += 1;
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          expired.push(subscription.endpoint);
        } else {
          console.error("Push send failed:", error.statusCode || error.message);
        }
      }
    }),
  );

  return { delivered, expired };
};

const removeExpiredSubscriptions = async (userId, expired) => {
  if (expired.length === 0) return;
  await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint: { $in: expired } } } });
};

const runReminderCheck = async (now = new Date()) => {
  const users = await User.find({
    "notificationSettings.enabled": true,
    "pushSubscriptions.0": { $exists: true },
  }).select("notificationSettings notificationLog pushSubscriptions foods dailyWater lastResetDate lastLoggedDate currentStreak");

  for (const user of users) {
    const reminders = computeDueReminders(user, now);
    for (const reminder of reminders) {
      const { expired } = await sendToSubscriptions(user.pushSubscriptions, {
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
        tag: reminder.key,
      });
      await User.updateOne({ _id: user._id }, { $set: { [`notificationLog.${reminder.key}`]: reminder.localDate } });
      await removeExpiredSubscriptions(user._id, expired);
    }
  }
};

let schedulerStarted = false;

const startReminderScheduler = () => {
  if (!isConfigured) {
    console.warn("Push reminders disabled: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable them.");
    return;
  }
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(() => {
    runReminderCheck().catch((error) => console.error("Reminder check failed:", error.message));
  }, CHECK_INTERVAL_MS);
};

module.exports = {
  isConfigured,
  publicKey,
  isValidTimezone,
  timeToMinutes,
  getLocalNow,
  computeDueReminders,
  sendToSubscriptions,
  removeExpiredSubscriptions,
  startReminderScheduler,
};

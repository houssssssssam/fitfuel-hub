const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");

const router = express.Router();

// Ensure uploads folder exists gracefully
const uploadDir = path.join(__dirname, "../uploads/photos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Map the Multer Storage buffer Engine natively mapping raw multipart payload data straight into isolated hard drive sectors
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

/**
 * Upload Photo
 * POST /api/photos/:userId
 */
router.post("/:userId", upload.single("photo"), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!req.file) {
      return res.status(400).json({ message: "No photo provided" });
    }

    const { date, note, category } = req.body;

    const newPhoto = {
      url: `/uploads/photos/${req.file.filename}`,
      date: date || new Date().toISOString().split("T")[0],
      note: note || "",
      category: category || "front",
    };

    user.progressPhotos.push(newPhoto);
    await user.save();

    res.json(user.progressPhotos);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload photo" });
  }
});

/**
 * Get Photos
 * GET /api/photos/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.progressPhotos || []);
  } catch (err) {
    console.error("Fetch photos error:", err);
    res.status(500).json({ message: "Failed to fetch photos" });
  }
});

/**
 * Delete Photo
 * DELETE /api/photos/:userId/:photoId
 */
router.delete("/:userId/:photoId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const photo = user.progressPhotos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    // Wipe it natively off the hard drive buffer storage system explicitly
    const filePath = path.join(__dirname, "..", photo.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Nuke from DB array map
    user.progressPhotos = user.progressPhotos.filter(
      (p) => p._id.toString() !== req.params.photoId
    );

    await user.save();
    res.json(user.progressPhotos);
  } catch (err) {
    console.error("Delete photo error:", err);
    res.status(500).json({ message: "Failed to delete photo" });
  }
});

module.exports = router;

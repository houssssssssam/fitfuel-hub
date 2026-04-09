const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs").promises;
const User = require("../models/User");

const router = express.Router();

const PHOTOS_DIR = path.join(__dirname, "../uploads/photos");
const THUMBNAILS_DIR = path.join(PHOTOS_DIR, "thumbnails");
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith("image/")) {
      cb(new Error("Only images allowed"), false);
      return;
    }

    cb(null, true);
  },
});

const ensurePhotoDirectories = async () => {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
};

const createPhotoFilenameBase = () =>
  `photo_${Date.now()}_${Math.round(Math.random() * 1e9)}`;

const toUploadUrl = (absolutePath) =>
  `/${path.relative(path.join(__dirname, ".."), absolutePath).replace(/\\/g, "/")}`;

const toUploadPath = (uploadUrl) => {
  if (!uploadUrl || typeof uploadUrl !== "string") return null;

  const cleanedPath = uploadUrl.replace(/^\/+/, "");
  if (!cleanedPath.startsWith("uploads/")) return null;

  return path.join(__dirname, "..", cleanedPath);
};

const runPhotoUpload = (req, res) => new Promise((resolve, reject) => {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const processImage = async (file) => {
  const filenameBase = createPhotoFilenameBase();
  const fullPath = path.join(PHOTOS_DIR, `${filenameBase}.jpg`);
  const thumbnailPath = path.join(THUMBNAILS_DIR, `${filenameBase}_thumb.jpg`);

  await ensurePhotoDirectories();

  const image = sharp(file.buffer, { failOn: "none" }).rotate();

  await image
    .clone()
    .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, progressive: true, mozjpeg: true })
    .toFile(fullPath);

  await image
    .clone()
    .resize(300, 300, { fit: "cover", position: "centre" })
    .jpeg({ quality: 75, progressive: true, mozjpeg: true })
    .toFile(thumbnailPath);

  return {
    url: toUploadUrl(fullPath),
    thumbnailUrl: toUploadUrl(thumbnailPath),
  };
};

const removeFileIfExists = async (targetPath) => {
  if (!targetPath) return;

  try {
    await fs.unlink(targetPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

const getUploadErrorPayload = (error) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return {
      status: 413,
      message: "Photo is too large. Please upload an image under 10MB.",
    };
  }

  if (typeof error?.message === "string" && error.message === "Only images allowed") {
    return {
      status: 400,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Upload failed",
  };
};

const getSafePhotoDate = (value) => {
  const candidate = value ? new Date(value) : new Date();
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
};

/**
 * Upload Photo
 * POST /api/photos/:userId
 */
router.post("/:userId", async (req, res) => {
  try {
    await runPhotoUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ message: "No photo uploaded" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { date, note, category } = req.body;
    const processedImage = await processImage(req.file);

    user.progressPhotos.push({
      url: processedImage.url,
      thumbnailUrl: processedImage.thumbnailUrl,
      date: getSafePhotoDate(date),
      note: note || "",
      category: category || "front",
    });

    await user.save();

    return res.status(201).json({
      message: "Photo uploaded",
      photo: user.progressPhotos[user.progressPhotos.length - 1],
    });
  } catch (error) {
    console.error("Upload error:", error);
    const payload = getUploadErrorPayload(error);
    return res.status(payload.status).json({ message: payload.message });
  }
});

/**
 * Get Photos
 * GET /api/photos/:userId
 */
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.userId);
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
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const photo = user.progressPhotos.id(req.params.photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    await Promise.all([
      removeFileIfExists(toUploadPath(photo.url)),
      removeFileIfExists(toUploadPath(photo.thumbnailUrl)),
    ]);

    user.progressPhotos = user.progressPhotos.filter(
      (entry) => entry._id.toString() !== req.params.photoId,
    );

    await user.save();
    res.json(user.progressPhotos);
  } catch (err) {
    console.error("Delete photo error:", err);
    res.status(500).json({ message: "Failed to delete photo" });
  }
});

module.exports = router;

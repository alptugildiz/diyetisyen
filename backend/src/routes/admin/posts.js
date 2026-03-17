const express = require("express");
const slugify = require("slugify");
const { z } = require("zod");
const Post = require("../../models/Post");
const { protect } = require("../../middleware/auth");

const router = express.Router();
router.use(protect); // All admin post routes are protected

const postSchema = z.object({
  title: z.string().min(1),
  excerpt: z.string().min(1).max(300),
  content: z.string().min(1),
  coverImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// GET /api/admin/posts
router.get("/", async (_req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).select("-content");
    res.json(posts);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/posts/:id
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/posts
router.post("/", async (req, res) => {
  try {
    const data = postSchema.parse(req.body);
    const slug = slugify(data.title, { lower: true, strict: true });
    const publishedAt = data.status === "published" ? new Date() : undefined;
    const post = await Post.create({ ...data, slug, publishedAt });
    res.status(201).json(post);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    if (err.code === 11000)
      return res.status(409).json({ message: "Slug already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/posts/:id
router.put("/:id", async (req, res) => {
  try {
    const data = postSchema.partial().parse(req.body);
    if (data.title)
      data.slug = slugify(data.title, { lower: true, strict: true });
    if (data.status === "published") data.publishedAt = data.publishedAt ?? new Date();
    const post = await Post.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    if (err.name === "ZodError")
      return res
        .status(400)
        .json({ message: "Validation error", errors: err.errors });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/posts/:id
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

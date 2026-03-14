const express = require("express");
const Post = require("../models/Post");

const router = express.Router();

// GET /api/posts  — published posts with pagination
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 9);
    const tag = req.query.tag;

    const filter = { status: "published" };
    if (tag) filter.tags = tag;

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("title slug excerpt coverImage tags publishedAt"),
      Post.countDocuments(filter),
    ]);

    res.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/tags — unique tags from published posts
router.get("/tags", async (_req, res) => {
  try {
    const tags = await Post.distinct("tags", { status: "published" });
    res.json(tags.filter(Boolean).sort());
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/:slug/related
router.get("/:slug/related", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: "published" })
      .select("_id tags");
    if (!post) return res.status(404).json({ message: "Post not found" });

    const related = await Post.find({
      status: "published",
      _id: { $ne: post._id },
      tags: { $in: post.tags },
    })
      .select("title slug excerpt coverImage tags publishedAt")
      .sort({ publishedAt: -1 })
      .limit(3);

    if (related.length < 3) {
      const exclude = [post._id, ...related.map((r) => r._id)];
      const fill = await Post.find({
        status: "published",
        _id: { $nin: exclude },
      })
        .select("title slug excerpt coverImage tags publishedAt")
        .sort({ publishedAt: -1 })
        .limit(3 - related.length);
      related.push(...fill);
    }

    res.json(related);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/:slug
router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({
      slug: req.params.slug,
      status: "published",
    });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

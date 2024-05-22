const { Router } = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  createPost,
  getAllPost,
  getPost,
  getCatPost,
  getUserPost,
  editPost,
  deletePost,
} = require("../controllers/postController");

const router = Router();

router.post("/", authMiddleware, createPost);
router.get("/", getAllPost);
router.get("/:id", getPost);
router.get("/categories/:category/", getCatPost);
router.get("/users/:id", getUserPost);
router.patch("/:id", authMiddleware, editPost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;

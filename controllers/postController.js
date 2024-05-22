const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");
const HttpError = require("../models/errorModel");

// ********* CREATE POST ********//
// POST : api/posts
// Potected
const createPost = async (req, res, next) => {
  try {
    const { title, category, description } = req.body;
    if (!title || !category || !description || !req.files) {
      return next(
        new HttpError("Fill in all the fields and choose thumbnail", 422)
      );
    }
    const { thumbnail } = req.files;

    //check thumbnail size
    if (thumbnail.size > 2000000) {
      return next(
        new HttpError(
          "Thumnail size too large, sizeshould be less than 2MB",
          422
        )
      );
    }

    let fileName = thumbnail.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];

    thumbnail.mv(
      path.join(__dirname, "..", "/uploads", newFilename),
      async (error) => {
        if (error) {
          return next(new HttpError(error));
        } else {
          const newPost = await Post.create({
            title,
            category,
            description,
            thumbnail: newFilename,
            creator: req.user.id,
          });
          if (!newPost) {
            return next(new HttpError("Post couldn't be created", 422));
          }

          // find user and increase post count by 1
          const currentUser = await User.findById(req.user.id);
          const userPostCount = currentUser.posts + 1;
          await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
          res.status(201).json(newPost);
        }
      }
    );
  } catch (error) {
    return next(new Error(error));
  }
};

// ********* GET ALL POST ********//
// GET : api/posts
// Unprotected
const getAllPost = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ********* GET SINGLE POST ********//
// GET : api/posts/:id
// Unprotected
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post Not Found", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ********* GET POST BY CATEGORY ********//
// GET : api/posts/:category
// Unprotected
const getCatPost = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPosts = await Post.find({ category }).sort({ createdAt: -1 });

    res.status(200).json(catPosts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ********* GET AUTHOR POST ********//
// GET : api/posts/users/:id
// Unprotected
const getUserPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ********* EDIT POST ********//
// PATCH : api/posts/:id
// Protected
const editPost = async (req, res, next) => {
  try {
    let fileName;
    let newFilename;
    let updatedPost;
    const postId = req.params.id;
    let { title, category, description } = req.body;

    // check if empty
    if (!title || !category || description < 12) {
      return next(new HttpError("Fill in all the fields", 422));
    }

    // get old post from db
    const oldPost = await Post.findById(postId);
    if (req.user.id == oldPost.creator) {
      if (!req.files) {
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          { title, category, description },
          { new: true }
        );
      } else {
        //delete old thumbnail from db
        fs.unlink(
          path.join(__dirname, "..", "uploads", oldPost.thumbnail),
          async (error) => {
            if (error) {
              return next(new HttpError(error));
            }
          }
        );
        // upload new thumbnaik
        const { thumbnail } = req.files;
        //check the file size
        if (thumbnail.size > 2000000) {
          return next(
            new HttpError("Thumbnail too large, should be less than 2MB")
          );
        }
        fileName = thumbnail.name;
        let splittedFilename = fileName.split(".");
        newFilename =
          splittedFilename[0] +
          uuid() +
          "." +
          splittedFilename[splittedFilename.length - 1];
        thumbnail.mv(
          path.join(__dirname, "..", "uploads", newFilename),
          async (err) => {
            if (err) {
              return next(new HttpError(err));
            }
          }
        );
        updatedPost = await Post.findByIdAndUpdate(
          postId,
          {
            title,
            description,
            category,
            thumbnail: newFilename,
          },
          { new: true }
        );
      }
    } else {
      return next(new HttpError("Post couldn't be edited", 403));
    }

    if (!updatedPost) {
      return next(new HttpError("Post couldn't be updated!", 400));
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// ********* EDIT POST ********//
// DELETE : api/posts/:id
// Protected
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    if (!postId) {
      return next(new HttpError("Post Unavailable", 400));
    }
    const post = await Post.findById(postId);
    const fileName = post?.thumbnail;

    if (req.user.id == post.creator) {
      //delete thumbnail from uploads folder
      fs.unlink(
        path.join(__dirname, "..", "uploads", fileName),
        async (err) => {
          if (err) {
            return next(new HttpError(err));
          } else {
            await Post.findByIdAndDelete(postId);
            //find user and reduce post count by 1
            const currentUser = await User.findById(req.user.id);
            const userPostCount = currentUser?.posts - 1;
            await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
          }
        }
      );
      res.status(200).json(`Post ${postId} deleted successfully`);
    } else {
      return next(new HttpError("Post couldn't be deleted", 403));
    }
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  createPost,
  getAllPost,
  getPost,
  getCatPost,
  getUserPost,
  editPost,
  deletePost,
};

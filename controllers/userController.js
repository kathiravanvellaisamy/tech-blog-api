// Post : api/users/register
// POST Request
// Unprotected Route

const HttpError = require("../models/errorModel");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;
    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const newEmail = email.toLowerCase();

    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists", 422));
    }

    if (password.trim().length < 6) {
      return next(
        new HttpError("Password should be atleast 6 Characters", 422)
      );
    }

    if (password != password2) {
      return next(new HttpError("Passwords do not match", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email: newEmail,
      password: hashedPassword,
    });
    res.status(201).json(`Account created for ${newUser.name} `);
  } catch (error) {
    return next(new HttpError("User registartion failed", 422));
  }
};

// Post : api/users/login
// POST Request
// Unprotected Route

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const newEmail = email.toLowerCase();

    const user = await User.findOne({ email: newEmail });
    if (!user) {
      return next(new HttpError("Invalid Crendentials", 422));
    }
    const comparePassword = await bcrypt.compare(password, user.password);
    if (!comparePassword) {
      return next(new HttpError("Invalid Crendentials", 422));
    }

    const { _id: id, name } = user;

    const token = jwt.sign({ id, name }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.status(200).json({ token, id, name });
  } catch (error) {
    return next(
      new HttpError("Login Failed.Please check your crendentials", 422)
    );
  }
};

// Profile
// Post : api/users/:id
// POST Request
// Protected Route

const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// Post : api/users/chnage-avatar
// POST Request
// Protected Route

const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files.avatar) {
      return next(new HttpError("Please choose an image", 422));
    }

    //find user from db
    const user = await User.findById(req.user.id);
    //delte old avatar if exits
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (error) => {
        if (error) {
          return next(new HttpError(error));
        }
      });
    }
    const { avatar } = req.files;

    //Check File Sie
    if (avatar.size > 500000) {
      return next(
        new HttpError("Profile picture too big, should be less than 500kb", 422)
      );
    }

    let fileName;
    fileName = avatar.name;
    let splittedFilename = fileName.split(".");
    let newFilename =
      splittedFilename[0] +
      uuid() +
      "." +
      splittedFilename[splittedFilename.length - 1];
    avatar.mv(
      path.join(__dirname, "..", "uploads", newFilename),
      async (error) => {
        if (error) {
          return next(new HttpError(error));
        }
        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFilename },
          { new: true }
        );
        if (!updatedAvatar) {
          return next(new HttpError("Avatar couldn't be changed", 422));
        }
        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error));
  }
};

// Post : api/users/edit-user
// POST Request
// Protected Route

const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, newConfirmPassword } =
      req.body;
    if (!name || !email || !currentPassword || !newPassword) {
      return next(new HttpError("Fill in all the fields", 422));
    }

    //Get User from the db
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found", 403));
    }

    // make sure new email doesn't already exists
    const emailExists = await User.findOne({ email });
    // we want to update other deatils with/without changing the email (which is a unique id because we use it to login)
    if (emailExists && emailExists._id != req.user.id) {
      return next(new HttpError("Email already exists", 422));
    }
    // compare current password to db password
    const validUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validUserPassword) {
      return next(new HttpError("Invalid current password", 422));
    }

    // compare new Password
    if (newPassword != newConfirmPassword) {
      return next(new HttpError("New Passwords do not match", 422));
    }

    // hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    //Update user info in db
    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );

    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error));
  }
};

// Post : api/users/authors
// POST Request
// UnProtected Route

const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("-password");
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error));
  }
};

module.exports = {
  registerUser,
  loginUser,
  changeAvatar,
  getAuthors,
  getUser,
  editUser,
};

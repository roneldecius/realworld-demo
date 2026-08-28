const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const {
  allProfiles,
  getProfile,
  followToggler,
} = require("../controllers/profiles");

//? All Profiles
router.get("/", verifyToken, allProfiles);

//? Profile
router.get("/:username", verifyToken, getProfile);

//* Follow Profile
router.post("/:username/follow", verifyToken, followToggler);

//* Unfollow Profile
router.delete("/:username/follow", verifyToken, followToggler);

module.exports = router;

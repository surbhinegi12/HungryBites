require("dotenv").config();
var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  try {
    res.json({ title: "CRUD ENDPOINT PROJECT" });
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;

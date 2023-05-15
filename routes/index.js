require("dotenv").config();
var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  try {
    var users = [
      "view users (get) route : /users",
      "login (post) route : /users/login",
      "signup (post) route : /users/signup",
      "delete account (delete) route : /users/:id",
      "logout (post) route : /users/logout",
      "update user (put) route : /users/:id",
    ];
    var products = [
      "view products (get) route : /products",
      "add product (post) route : /products/addProduct",
      "delete product (delete) route : /products/:id",
    ];
    var orders = [
      "view orders (get) route : /orders",
      "add orders (post) route : /orders/addOrder",
    ];

    res.status(200).json({users, products, orders});
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;

const express = require("express");
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const ordersRouter = require("./routes/orders");
const productsRouter = require("./routes/products");
const {authenticateToken}= require("./middleware/validations")

var app = express();

const session = require("express-session");
const port = 3000;
app.use(express.json());
app.use(
  session({
    secret: "surbhi",
    resave: true,
    saveUninitialized: true,
  })
);

const esClient=require('./utils/elasticsearch');

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/orders",authenticateToken, ordersRouter);
app.use("/products",authenticateToken, productsRouter);

app.listen({ port, host: "0.0.0.0" }, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;

var express = require("express");
var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var ordersRouter = require("./routes/orders");
var productsRouter = require("./routes/products");

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

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/orders", ordersRouter);
app.use("/products", productsRouter);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;

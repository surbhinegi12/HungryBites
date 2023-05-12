var express = require("express");
var router = express.Router();
const DB = require("../services/DB");

router.get("/", async (req, res) => {
  const { id, name, minPrice, maxPrice } = req.query;

  try {
    const products = await DB("product");
    let filteredProducts = products;

    if (id) {
      filteredProducts = filteredProducts.filter((product) => product.id == id);
    }

    if (name) {
      filteredProducts = filteredProducts.filter((product) =>
        product.name.includes(name)
      );
    }

    if (minPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => parseFloat(product.price) >= minPrice
      );
    
    }

    if (maxPrice) {
      filteredProducts = filteredProducts.filter(
        (product) => parseFloat(product.price) <= maxPrice
      );
    }
    if (filteredProducts.length === 0) {
      return res.status(404).send("No results");
    } else {
      return res.status(200).json(filteredProducts);
    }
  } catch (err) {
    res.json(err);
  }
});

function validateProduct(req, res, next) {
  const { id, name, price, units } = req.body;
  if (id) {
    if (
      (name !== undefined && typeof name !== "string") ||
      (price !== undefined && typeof price !== "number") ||
      (units !== undefined && typeof units !== "number")
    ) {
      return res.status(400).send("Invalid input format for product");
    }
  }
  next();
}

function checkAdmin(req, res, next) {
  const email = req.session.email;
  if (email === "admin@gmail.com") {
    next();
  } else {
    res.status(401).send("Unauthorized access");
  }
}

router.post("/addProduct", checkAdmin, validateProduct, async (req, res) => {
  const { id, name, price, units } = req.body;
  try {
    let existingProduct;
    if (id) {
      existingProduct = await DB("product").where({ id }).select("id").first();
    }
    if (existingProduct) {
      console.log(req.body);
      await DB("product").where({ id }).update({
        name: name,
        price: price,
        units: units,
      });
      res.status(200).send("Product updated successfully");
    } else {
      await DB("product")
        .insert({
          id,
          name,
          price,
          units,
        })
        .returning("*");
      res.status(201).send("Product added successfully");
    }
  } catch (err) {
    if (err.code === "23502") {
      return res.status(400).send("Required field missing");
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

function validateId(req, res, next) {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).send("Invalid id parameter, must be an integer");
  }
  next();
}

router.delete("/:id", validateId, async (req, res) => {
  const { id } = req.params;
  try {
    const numDeleted = await DB("product").where({ id }).del();
    if (numDeleted === 0) {
      res.status(404).send(`Product with id ${id} does not exist`);
    } else {
      res.status(200).send(`Product with id ${id} deleted`);
    }
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;

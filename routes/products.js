var express = require("express");
var router = express.Router();
const DB = require("../services/DB");
const client = require("../utils/elasticsearch");

const productMapping = {
  properties: {
    name: { type: "text" },
    price: { type: "double" },
    units: { type: "integer" },
  },
};

const indexName = "products";

async function createProductIndex() {
  try {
    const indexExists = await client.indices.exists({ index: indexName });
    if (indexExists) {
      console.log(
        `Index '${indexName}' already exists. Skipping index creation.`
      );
      return;
    }

    const response = await client.indices.create({
      index: indexName,
      body: {
        mappings: productMapping,
      },
    });

    console.log(`Index '${indexName}' and mapping created successfully`);
  } catch (error) {
    console.error("Error creating index:", error);
  }
}

createProductIndex();

router.get("/", async (req, res) => {
  try {
    const data = await client.search({
      index: "products",
      body: {
        query: {
          match_all: {},
        },
      },
    });
    res
      .status(200)
      .json({ products: data.hits.hits.map((hit) => hit._source) });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/", async (req, res) => {
  const { name, price, units } = req.body;
  try {
    const [product] = await DB("product")
      .insert({ name, price, units })
      .returning("*");
    product.price = +product.price;
    client.index({
      index: "products",
      id: product.id,
      body: {
        id: product.id,
        name: product.name,
        price: product.price,
        units: product.units,
      },
    });

    res.status(201).json({ product });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Error" });
  }
});

router.delete("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(productId);
    await client.delete({
      index: "products",
      id: productId,
    });
    await DB("product").where({ id: productId }).del();

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Product cannot be deleted" });
  }
});

router.put("/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const { name, price, units } = req.body;
    await client.update({
      index: "products",
      id: productId,
      body: {
        doc: {
          name,
          price,
          units,
        },
      },
    });
    await DB("product").where({ id: productId }).update({
      name,
      price,
      units,
    });

    res.status(200).json({ message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

// function validateId(req, res, next) {
//   const { id } = req.params;
//   if (!Number.isInteger(Number(id))) {
//     return res.status(400).send("Invalid id parameter, must be an integer");
//   }
//   next();
// }

// router.get("/", async (req, res) => {
//   const { id, name, minPrice, maxPrice } = req.query;

//   try {
//     const products = await DB("product");
//     let filteredProducts = products;

//     if (id) {
//       filteredProducts = filteredProducts.filter((product) => product.id == id);
//     }

//     if (name) {
//       filteredProducts = filteredProducts.filter((product) =>
//         product.name.includes(name)
//       );
//     }

//     if (minPrice) {
//       filteredProducts = filteredProducts.filter(
//         (product) => parseFloat(product.price) >= minPrice
//       );

//     }

//     if (maxPrice) {
//       filteredProducts = filteredProducts.filter(
//         (product) => parseFloat(product.price) <= maxPrice
//       );
//     }
//     if (filteredProducts.length === 0) {
//       return res.status(404).send("No results");
//     } else {
//       return res.status(200).json(filteredProducts);
//     }
//   } catch (err) {
//     res.json(err);
//   }
// });

// function validateProduct(req, res, next) {
//   const { id, name, price, units } = req.body;
//   if (id) {
//     if (
//       (name !== undefined && typeof name !== "string") ||
//       (price !== undefined && typeof price !== "number") ||
//       (units !== undefined && typeof units !== "number")
//     ) {
//       return res.status(400).send("Invalid input format for product");
//     }
//   }
//   next();
// }

// function checkAdmin(req, res, next) {
//   const email = req.session.email;
//   if (email === "admin@gmail.com") {
//     next();
//   } else {
//     res.status(401).send("Unauthorized access");
//   }
// }

// router.post("/addProduct", checkAdmin, validateProduct, async (req, res) => {
//   const { id, name, price, units } = req.body;
//   try {
//     let existingProduct;
//     if (id) {
//       existingProduct = await DB("product").where({ id }).select("id").first();
//     }
//     if (existingProduct) {
//       console.log(req.body);
//       await DB("product").where({ id }).update({
//         name: name,
//         price: price,
//         units: units,
//       });
//       res.status(200).send("Product updated successfully");
//     } else {
//       await DB("product")
//         .insert({
//           id,
//           name,
//           price,
//           units,
//         })
//         .returning("*");
//       res.status(201).send("Product added successfully");
//     }
//   } catch (err) {
//     if (err.code === "23502") {
//       return res.status(400).send("Required field missing");
//     } else {
//       res.status(500).send("Internal server error");
//     }
//   }
// });

// router.delete("/:id", validateId, async (req, res) => {
//   const { id } = req.params;
//   try {
//     const numDeleted = await DB("product").where({ id }).del();
//     if (numDeleted === 0) {
//       res.status(404).send(`Product with id ${id} does not exist`);
//     } else {
//       res.status(200).send(`Product with id ${id} deleted`);
//     }
//   } catch (err) {
//     res.json(err);
//   }
// });

module.exports = router;

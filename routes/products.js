var express = require("express");
var router = express.Router();
const DB = require("../services/DB");
const client = require("../utils/elasticsearch");

const productMapping = {
  properties: {
    id: { type: "keyword" },
    name: { type: "text",
    fields: {
      raw: {
        type: "keyword",
      },
    },
   },
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
    await client.index({
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

module.exports = router;

var express = require("express");
var router = express.Router();
const DB = require("../services/DB");
const client = require("../utils/elasticsearch");

const orderMapping = {
  properties: {
    id: { type: "keyword" },
    user_id: { type: "keyword" },
    products: {
      properties: {
        product_id: { type: "keyword" },
        quantity: { type: "integer" },
        price: { type: "double" },
      },
    },
    amount: { type: "double" },
    location: { type: "geo_point" },
    created_at: { type: "date" },
  },
};

const indexName = "orders";

async function createOrderIndex() {
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
        mappings: orderMapping,
      },
    });

    console.log(`Index '${indexName}' and mapping created successfully`);
  } catch (error) {
    console.error("Error creating index:", error);
  }
}

createOrderIndex();

router.get("/", async (req, res) => {
  const userId = req.session.userId;
  const { dategte, datelte, distance, location } = req.query;

  try {
    const query = {
      bool: {
        must: [],
      },
    };

    query.bool.must.push({
      term: {
        user_id: userId,
      },
    });

    if ((distance, location)) {
      query.bool.must.push({
        geo_distance: {
          distance: distance,
          location: location,
        },
      });
    }

    if (dategte || datelte) {
      query.bool.must.push({
        range: {
          created_at: {
            gte: dategte,
            lte: datelte,
          },
        },
      });
    }

    const data = await client.search({
      index: "orders",
      query: query,
    });
    res.status(200).json({ orders: data.hits.hits });
  } catch (err) {
    if (userId === undefined) {
      res.status(401).send("Login to see orders");
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

router.post("/", async (req, res) => {
  const userId = req.session.userId;
  let error = false;
  if (userId === undefined) {
    error = true;
    res.status(401).send("Login to place an order");
    return;
  }
  const { orderDetails, products } = req.body;
  orderDetails.created_at = new Date();
  orderDetails.user_id = userId;

  try {
    const orderId = await DB.transaction(async (trx) => {
      let orderAmount = 0;

      for (const data of products) {
        const product = await trx("product")
          .where("id", data.product_id)
          .select("units", "price")
          .first();
        if (!product) {
          error = true;
          res.status(404).send("Product does not exist");
          break;
        }

        const price = product.price * data.quantity;
        orderAmount += price;
        data.price = price;
        if (data.quantity == null || data.quantity <= 0) {
          error = true;
          res.status(400).send("Quantity cannot be empty or negative");
          break;
        } else if (product.units == null || product.units < data.quantity) {
          error = true;
          res.status(400).send("Product not available");
          break;
        } else {
          const updatedUnits = product.units - data.quantity;
          await trx("product")
            .update({ units: updatedUnits })
            .where("id", data.product_id);

          await client.update({
            index: "products",
            id: data.product_id,
            body: {
              doc: {
                units: updatedUnits,
              },
            },
          });
        }
      }

      if (error) {
        return null;
      }

      orderDetails.amount = orderAmount;

      const [order] = await trx("order").insert(orderDetails).returning("id");

      for (const data of products) {
        await trx("orderDetails").insert({
          order_id: order.id,
          product_id: data.product_id,
          quantity: data.quantity,
          price: data.price,
        });
      }

      await client.index({
        index: "orders",
        id: order.id,
        body: {
          ...orderDetails,

          products: products,
        },
      });

      return order.id;
    });

    if (orderId == null) {
      return;
    }
    return res
      .status(201)
      .json({ success: { order: orderDetails, products: products } });
  } catch (err) {
    if (err.code === "23502") {
      return res.status(400).send("Required field missing");
    } else {
      return res.status(500).send("Internal server error");
    }
  }
});

module.exports = router;

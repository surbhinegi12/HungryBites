var express = require("express");
var router = express.Router();
const DB = require("../services/DB");

router.get("/", async (req, res) => {
  const {
    productId,
    orderId,
    createdBefore,
    createdAfter,
    distance,
    latitude,
    longitude,
  } = req.query;
  const userId = req.session.userId;

  try {
    const orders = await DB.select([
      "o.id",
      "o.user_id",
      "o.amount",
      DB.raw(
        "jsonb_agg(jsonb_build_object('id', od.product_id, 'quantity', od.quantity, 'price', od.price, 'name', p.name)) as order_details"
      ),
    ])
      .from("order as o")
      .join("orderDetails as od", { "od.order_id": "o.id" })
      .join("product as p", { "od.product_id": "p.id" })
      .where((builder) => {
        if (productId) {
          builder.where("p.id", productId);
        }
        if (orderId) {
          builder.where("o.id", orderId);
        }
        if (createdBefore) {
          builder.where("o.created_at", "<=", new Date(createdBefore));
        }
        if (createdAfter) {
          builder.where("o.created_at", ">=", new Date(createdAfter));
        }
        if (distance) {
          const newdistance = Number(distance);
          builder.where(
            DB.raw(
              `ST_DWithin(o.location, ST_GeometryFromText('Point(${longitude}  ${latitude} )'),${newdistance})`
            )
          );
        }
      })
      .where("user_id", userId)
      .groupBy("o.id");

    res.json(orders);
  } catch (err) {
    if (userId === undefined) {
      res.status(401).send("Login to see orders");
    } else {
      res.status(500).send("Internal server error");
    }
  }
});

router.post("/addOrder", async (req, res) => {
  const userId = req.session.userId;
  let error = false;
  if (userId === undefined) {
    error = true;
    res.status(401).send("Login to place an order");
    return;
  }
  const { orderData, orderDetailsData } = req.body;
  orderData.created_at = new Date();
  orderData.user_id = userId;

  try {
    const orderId = await DB.transaction(async (trx) => {
      let orderAmount = 0;

      for (const data of orderDetailsData) {
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
        }
      }

      if (error) {
        return null;
      }

      orderData.amount = orderAmount;

      const [order] = await trx("order").insert(orderData).returning("id");

      for (const data of orderDetailsData) {
        await trx("orderDetails").insert({
          order_id: order.id,
          product_id: data.product_id,
          quantity: data.quantity,
          price: data.price,
        });
      }

      return order.id;
    });

    if (orderId == null) {
      return;
    }

    return res.status(201).send("Order added successfully");
  } catch (err) {
    if (err.code === "23502") {
      return res.status(400).send("Required field missing");
    } else {
      return res.status(500).send("Internal server error");
    }
  }
});

module.exports = router;

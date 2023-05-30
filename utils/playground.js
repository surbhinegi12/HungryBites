const client = require("./elasticsearch");

function createDocument(body) {
  return client.index({
    index: "users",
    document: body,
    id: 2,
  });
}

createDocument({
  name: "surbhi",
  password: "surbhi",
  address: "delhi",
  email: "surbhi@gmail.com",
}).catch((err) => console.error(err));

//PRODUCTS

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



//USERS

// router.get("/", async (req, res) => {
//   try {
//     const users = await DB("user")
//       .select(["id", "name", "address", "email"])
//       .whereNull("deleted_at");
//     res.status(200).json(users);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

// router.get("/:id", validateId, async (req, res) => {
//   const { id } = req.params;

//   try {
//     const users = await DB("user")
//       .where({ id: id })
//       .select(["id", "name", "address", "email"])
//       .whereNull("deleted_at");
//     if (users.length == 0) {
//       res.status(404).send("User does not exists");
//     }
//     res.json(users);
//   } catch (err) {
//     res.json(err);
//   }
// });

// router.post("/signup", async (req, res) => {
//   const { name, email, password, address } = req.body;
//   const salt = bcrypt.genSaltSync(10);
//   const hash = bcrypt.hashSync(password, salt);
//   if (!validator.isEmail(email)) {
//     return res.status(400).send("Invalid email address");
//   }
//   try {
//     const [existingUser] = await DB("user").where({ email, deleted_at: null });
//     if (existingUser) {
//       return res.status(400).send("User with this email already exists");
//     }
//     const [newUser] = await DB("user")
//       .insert({
//         name,
//         email,
//         password: hash,
//         address,
//       })
//       .returning("id");
//     res.status(201).send(`User with id ${newUser.id} created`);
//   } catch (err) {
//     if (err.code === "23502") {
//       return res.status(400).send("Required field missing");
//     } else {
//       console.error(err);
//       return res.status(500).send("Internal server error");
//     }
//   }
// });

// router.delete("/:id", validateId, async (req, res) => {
//   const { id } = req.params;
//   try {
//     const userId = req.session.userId;
//     const deleted_at = new Date();
//     if (id != userId) {
//       return res.status(400).send("Unauthorised access");
//     }
//     const result = await DB("user")
//       .where({ id: id, id: userId })
//       .update({ deleted_at: deleted_at });

//     if (result != 0) {
//       res.status(200).send(`User with id ${id} deleted`);
//     }
//   } catch (err) {
//     res.status(500).json(err);
//   }
// });

// router.put("/:id", validateId, async (req, res) => {
//   const { id } = req.params;
//   try {
//     const userId = req.session.userId;
//     if (id != userId) {
//       return res.status(400).send("Unauthorised access");
//     }
// await client.update({
//   index: "users",
//   id: id,
//   body: {
//     doc: {
//       name,
//       address
//     },
//   },
// });
//     await DB("user")
//       .where({ id: id })
//       .where("id", userId)
//       .update(req.body)
//       .then(() => {
//         res.status(201).send(`User with id ${id} has been updated.`);
//       });
//   } catch (err) {
//     res.json(err);
//   }
// });

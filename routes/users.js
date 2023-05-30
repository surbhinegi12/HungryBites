var express = require("express");
var router = express.Router();
const DB = require("../services/DB");
const bcrypt = require("bcrypt");
const validator = require("validator");
const client = require("../utils/elasticsearch");

const userMapping = {
  properties: {
    id: { type: "keyword" },
    name: { type: "text" },
    email: { type: "keyword" },
    password: { type: "keyword" },
    address: { type: "text" },
  },
};

const indexName = "users";

async function createUserIndex() {
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
        mappings: userMapping,
      },
    });

    console.log(`Index '${indexName}' and mapping created successfully`);
  } catch (error) {
    console.error("Error creating index:", error);
  }
}

createUserIndex();

router.post("/signup", async (req, res) => {
  const { name, password, email, address } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  if (!validator.isEmail(email)) {
    return res.status(400).send("Invalid email address");
  }
  try {
    const [existingUser] = await DB("user").where({ email, deleted_at: null });
    if (existingUser) {
      return res.status(400).send("User with this email already exists");
    }
    const [newUser] = await DB("user")
      .insert({
        name,
        email,
        password: hash,
        address,
      })
      .returning("*");
    await client.index({
      index: "users",
      id: newUser.id,
      body: newUser,
    });
    res.status(201).json({ user: newUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal server error" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await client.search({
      index: "users",
      body: {
        query: {
          match_all: {},
        },
      },
    });
    res.status(200).json({ users: data.hits.hits.map((hit) => hit._source) });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    await DB("user")
      .where({ email })
      .whereNull("deleted_at")
      .first()
      .then((user) => {
        if (!user) {
          res.status(401).send("Invalid email or password");
        } else {
          bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
              const sessionId = req.session.id;
              req.session.userId = user.id;
              req.session.email = user.email;
              res
                .status(200)
                .send(`Login success with session id ${sessionId}`);
            } else {
              res.status(401).send("Invalid email or password");
            }
          });
        }
      });
  } catch (err) {
    res.json(err);
  }
});

router.post("/logout", (req, res) => {
  const sessionId = req.session.id;
  req.session.destroy(() => {
    return res.status(200).send(`Logout success for session id ${sessionId}`);
  });
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
    const userId = req.session.userId;
    const deleted_at = new Date();
    if (id != userId) {
      return res.status(400).send("Unauthorised access");
    }
    await client.delete({
      index: "users",
      id: id,
    });
    const result = await DB("user")
      .where({ id: id, id: userId })
      .update({ deleted_at: deleted_at });

    if (result != 0) {
      res.status(200).send(`User with id ${id} deleted`);
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/:id", validateId, async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.session.userId;
    if (id != userId) {
      return res.status(400).send("Unauthorised access");
    }

    const [updatedDetails] = await DB("user")
      .where({ id: id })
      .where("id", userId)
      .update(req.body)
      .returning("*");

    await client.update({
      index: "users",
      id: id,
      body: {
        doc: updatedDetails,
      },
    });

    res.status(201).send(`User with id ${id} has been updated.`);
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;

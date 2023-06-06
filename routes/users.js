var express = require("express");
var router = express.Router();
const DB = require("../services/DB");
const bcrypt = require("bcrypt");
const validator = require("validator");
const client = require("../utils/elasticsearch");
const jwt = require("jsonwebtoken");
const { validateId, authenticateToken, validateRole } = require("../middleware/validations");

function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: "2d" });
}

const userMapping = {
  properties: {
    id: { type: "keyword" },
    name: { type: "text" },
    email: { type: "keyword" },
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

router.get("/",authenticateToken,validateRole, async (req, res) => {
  const { email } = req.query;
  try {
    const query = {
      bool: {
        must: [],
      },
    };

    if (email) {
      query.bool.must.push({
        term: {
          email: email,
        },
      });
    }

    const data = await client.search({
      index: "users",
      body: {
        query: query,
      },
    });

    res.status(200).json({ users: data.hits.hits.map((hit) => hit._source) });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/signup", async (req, res) => {
  const { name, password, email, address } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  if (!validator.isEmail(email)) {
    return res.status(400).json({msg:"Invalid email address"});
  }
  try {
    const [existingUser] = await DB("user").where({ email, deleted_at: null });
    if (existingUser) {
      return res.status(400).json({msg:"User with this email already exists"});
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
      body: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        address: newUser.address,
      },
    });
    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      address: newUser.address,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Internal server error" });
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
          res.status(401).json({msg:"Invalid email or password"});
        } else {
          bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
              const token = generateAccessToken({
                email: user.email,
                id: user.id,
              });
              console.log(user.email, user.id);
              res.status(200).json({ msg: "Login success with token", token });
            } else {
              res.status(401).json({ msg: "Invalid email or password" });
            }
          });
        }
      });
  } catch (err) {
    res.json(err);
  }
});

router.delete("/:id", validateId, authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    const userId = req.user.id;
    const deleted_at = new Date();
    if (id != userId) {
      return res.status(400).json({msg:"Unauthorised access"});
    }
    await client.delete({
      index: "users",
      id: id,
    });
    const result = await DB("user")
      .where({ id: id, id: userId })
      .update({ deleted_at: deleted_at });

    if (result != 0) {
      res.status(200).json({msg:"User deleted successfully"});
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/:id", validateId, authenticateToken, async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  try {
    const userId = user.id;
    console.log(userId, id);
    if (id != userId) {
      return res.status(400).send("Unauthorised access");
    }

    const [updatedDetails] = await DB("user")
      .where({ id: id })
      .where("id", userId)
      .update(req.body)
      .returning("*");
    console.log({ updatedDetails });
    await client.update({
      index: "users",
      id: id,
      body: {
        doc: {
          id: updatedDetails.id,
          name: updatedDetails.name,
          email: updatedDetails.email,
          address: updatedDetails.address,
        },
      },
    });

    res.status(201).json({msg:"User updated successfully"});
  } catch (err) {
    res.json(err);
  }
});

module.exports = router;

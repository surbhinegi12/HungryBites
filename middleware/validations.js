const jwt = require("jsonwebtoken");
const DB = require("../services/DB");

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    console.log(err);

    if (err) return res.sendStatus(403);

    req.user = user;

    const [flag] = await DB("user")
      .whereNull("deleted_at")
      .where({ id: req.user.id });
    if (!flag) {
      return res.status(400).json({ msg: "Bad request" });
    }
    next();
  });
}

function validateId(req, res, next) {
  const { id } = req.params;
  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({msg:"Invalid id parameter, must be an integer"});
  }
  next();
}

async function validateRole(req, res, next) {
  const [user] = await DB("user").where({ id: req.user.id });
  console.log(user)
  if (user.role_id == 1) {
    next();
  }
  else
  return res.status(403).json({ msg: "User is not admin" });
}

module.exports = { validateId, authenticateToken, validateRole };

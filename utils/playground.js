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

const express = require("express");
const mongoose = require("mongoose");
const api = require("./api");
const app = express();
const port = 3000; //process.env.PORT;

// Connect mongoose to database
mongoose
  .connect("mongodb://127.0.0.1:27017/propel-db")
  .then(() => {
    console.log("connected to database");
  })
  .catch((e) => {
    console.log("Couldn't connect to database");
    console.log(e);
  });

app.use(express.json());

// Call api
api(app);

app.listen(port, () => console.log(`listening on port: ${port}`));

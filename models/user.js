const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, value: new Date() },
});

const userModel = mongoose.model("User", userSchema);

module.exports = { userModel };

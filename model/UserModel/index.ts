import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  verified: { type: Boolean, required: true, default: false }
});

const UserModel = mongoose.model("user", UserSchema);

export default UserModel;

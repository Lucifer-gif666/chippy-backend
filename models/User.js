  import mongoose from "mongoose";
  import bcrypt from "bcryptjs";

  const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, 
    role: { type: String, enum: ["admin", "staff"], default: "staff" },
    verified: { type: Boolean, default: false },
    googleId: { type: String },

    // 🔔 PUSH NOTIFICATIONS
    fcmToken: { type: String },
    isPWAInstalled: { type: Boolean, default: false },
  });


  // PREVENT DOUBLE HASHING
  UserSchema.pre("save", async function (next) {
    // If password not modified → skip
    if (!this.isModified("password")) return next();

    // If password ALREADY STARTS WITH bcrypt prefix → skip hashing
    if (this.password && this.password.startsWith("$2a$")) {
      return next();
    }

    // Hash normally
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  });

  // Compare password
  UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  const User = mongoose.model("User", UserSchema);
  export default User;

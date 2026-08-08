import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ["ADMIN", "MEMBER"],
        message: "{VALUE} is not a valid user role",
      },
      default: "MEMBER",
      uppercase: true,
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "{VALUE} is not a valid status",
      },
      default: "ACTIVE",
      uppercase: true,
    },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Pre-save hook to ensure email normalization
userSchema.pre("save", function (next) {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.role) {
    this.role = this.role.toUpperCase();
  }
  next();
});

export const User = mongoose.model("User", userSchema);

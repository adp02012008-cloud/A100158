import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    bitEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      required: [true, "User name is required"],
      trim: true,
    },
    enrolmentNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
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
    position: {
      type: String,
      default: "Member",
      trim: true,
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cluster",
      default: null,
      index: true,
    },
    clusterName: {
      type: String,
      default: "",
      trim: true,
    },
    mobile: {
      type: String,
      default: "",
      trim: true,
    },
    joinedDate: {
      type: String,
      default: "",
      trim: true,
    },
    linkedin: {
      type: String,
      default: "",
      trim: true,
    },
    github: {
      type: String,
      default: "",
      trim: true,
    },
    activityPoints: {
      type: Number,
      default: 0,
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
    primaryInterests: [{ type: String, trim: true }],
    secondaryInterests: [{ type: String, trim: true }],
    specializations: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE"],
        message: "{VALUE} is not a valid status",
      },
      default: "ACTIVE",
      uppercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

userSchema.pre("save", function () {
  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.personalEmail) {
    this.personalEmail = this.personalEmail.trim().toLowerCase();
  }
  if (this.bitEmail) {
    this.bitEmail = this.bitEmail.trim().toLowerCase();
  }
  if (this.role) {
    this.role = this.role.toUpperCase();
  }
});

export const User = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allow null but enforce uniqueness for non-null values
    },
    password: {
      type: String,
      sparse: true, // Optional for now, as we're using simple username auth
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    settings: {
      trackingEnabled: {
        type: Boolean,
        default: true,
      },
      syncInterval: {
        type: Number,
        default: 5, // in minutes
        min: 1,
        max: 60,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

// Pre-save middleware to hash the password
UserSchema.pre("save", async function (next) {
  const user = this;

  // Only hash the password if it has been modified or is new
  if (!user.isModified("password") || !user.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last active timestamp
UserSchema.methods.updateActivity = async function () {
  this.lastActive = new Date();
  await this.save();
};

const User = mongoose.model("User", UserSchema);

module.exports = User;

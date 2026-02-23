import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  name?: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Date;
  refreshTokens: string[];
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidate: string): Promise<boolean>;
  toPublicJSON(): PublicUser;
}

export interface PublicUser {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

interface IUserModel extends Model<IUserDocument> {
  findByEmail(email: string): Promise<IUserDocument | null>;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    avatar: { type: String },
    bio: { type: String, maxlength: 160 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    refreshTokens: { type: [String], default: [], select: false },
    blockedUsers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublicJSON = function (): PublicUser {
  return {
    id: this._id.toString(),
    name: this.name || this.username,
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    createdAt: this.createdAt,
  };
};

userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email }).select('+password +refreshTokens');
};

export const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);

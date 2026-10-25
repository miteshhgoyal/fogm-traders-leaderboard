import { Schema, model, models, type Model } from "mongoose";

export interface IUser {
  email: string;
  name: string;
  avatarUrl: string | null;
  showName: boolean;
  showPhoto: boolean;
  country: string | null;
  profileComplete: boolean;
  status: "active" | "disabled";
  lastLoginAt: Date | null;
  loginCount: number;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "", trim: true, maxlength: 30 },
    avatarUrl: { type: String, default: null },
    showName: { type: Boolean, default: true },
    showPhoto: { type: Boolean, default: true },
    country: { type: String, default: null },
    profileComplete: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    lastLoginAt: { type: Date, default: null },
    loginCount: { type: Number, default: 0 },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User: Model<IUser> = (models.User as Model<IUser> | undefined) ?? model<IUser>("User", schema);

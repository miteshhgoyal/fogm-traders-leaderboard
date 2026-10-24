import { Schema, model, models, type Model } from "mongoose";

export interface IUser {
  email: string;
  name: string;
  avatarUrl: string | null;
  /** Name and photo are public only when this is true. */
  publicConsent: boolean;
  country: string | null;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IUser>(
  {
    // `unique` creates the index
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "", trim: true, maxlength: 30 },
    avatarUrl: { type: String, default: null },
    publicConsent: { type: Boolean, default: false },
    country: { type: String, default: null },
    profileComplete: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User: Model<IUser> = (models.User as Model<IUser> | undefined) ?? model<IUser>("User", schema);

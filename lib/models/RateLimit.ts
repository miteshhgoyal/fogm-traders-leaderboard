import { Schema, model, models, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  resetAt: Date;
}

const schema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true },
});
// TTL: the window document disappears once resetAt passes.
schema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> = (models.RateLimit as Model<IRateLimit> | undefined) ?? model<IRateLimit>("RateLimit", schema);

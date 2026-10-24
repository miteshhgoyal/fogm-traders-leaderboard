import { Schema, model, models, type Model } from "mongoose";

export interface IOtpCode {
  email: string;
  /** sha256(salt + code), hex. The code itself is never stored. */
  hash: string;
  salt: string;
  attempts: number;
  expiresAt: Date;
}

const schema = new Schema<IOtpCode>({
  email: { type: String, required: true, index: true },
  hash: { type: String, required: true },
  salt: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
// TTL: Mongo deletes the document as soon as expiresAt passes (checked every ~60s).
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpCode: Model<IOtpCode> = (models.OtpCode as Model<IOtpCode> | undefined) ?? model<IOtpCode>("OtpCode", schema);

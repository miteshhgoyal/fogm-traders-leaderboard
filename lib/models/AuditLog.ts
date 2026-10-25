import { Schema, model, models, type Model } from "mongoose";

export interface IAuditLog {
  actor: string;
  action: string;
  target: string;
  before: object | null;
  after: object | null;
  ip: string;
  createdAt: Date;
}

const schema = new Schema<IAuditLog>(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL: 180 days
schema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const AuditLog: Model<IAuditLog> = (models.AuditLog as Model<IAuditLog> | undefined) ?? model<IAuditLog>("AuditLog", schema);

import { Schema, model, models, type Model } from "mongoose";

export interface ITrader {
  userId?: string;
  name: string;
  countryCode: string;
  city: string;
  netProfit: number;
  returnPct: number;
  winRatePct: number;
  maxDrawdownPct: number;
  tradesCount: number;
  volumeLots: number;
  topInstrument: string;
  trend: number[];
  period: "today" | "week" | "overall";
  previousRank: number | null;
  updatedAt: Date;
}

const schema = new Schema<ITrader>(
  {
    userId: { type: String, default: null },
    name: { type: String, required: true },
    countryCode: { type: String, required: true },
    city: { type: String, required: true },
    netProfit: { type: Number, required: true },
    returnPct: { type: Number, required: true },
    winRatePct: { type: Number, required: true },
    maxDrawdownPct: { type: Number, required: true },
    tradesCount: { type: Number, required: true },
    volumeLots: { type: Number, required: true },
    topInstrument: { type: String, required: true },
    trend: [Number],
    period: { type: String, enum: ["today", "week", "overall"], required: true },
    previousRank: { type: Number, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

schema.index({ period: 1, netProfit: -1 });

export const Trader: Model<ITrader> = (models.Trader as Model<ITrader> | undefined) ?? model<ITrader>("Trader", schema);

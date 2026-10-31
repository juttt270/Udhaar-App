import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDailyExpense {
  id: string;
  title: string;
  amount: number;
}

export interface IDailyRevenue extends Document {
  userId: Types.ObjectId;
  date: string;
  plantCostPerBottle: number;
  autoBottles?: number;
  extraBottles?: number;
  bottlesSold: number;
  autoBilled?: number;
  extraBilled?: number;
  actualBilled: number;
  cashReceived: number;
  wholesaleCost: number;
  expenses: IDailyExpense[];
  totalExpenses: number;
  netProfit: number;
  profitShare20: number;
  actualProfit: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyExpenseSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DailyRevenueSchema = new Schema<IDailyRevenue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    plantCostPerBottle: { type: Number, required: true, default: 35 },
    autoBottles: { type: Number, default: 0 },
    extraBottles: { type: Number, default: 0 },
    bottlesSold: { type: Number, required: true, default: 0 },
    autoBilled: { type: Number, default: 0 },
    extraBilled: { type: Number, default: 0 },
    actualBilled: { type: Number, required: true, default: 0 },
    cashReceived: { type: Number, required: true, default: 0 },
    wholesaleCost: { type: Number, required: true, default: 0 },
    expenses: [DailyExpenseSchema],
    totalExpenses: { type: Number, required: true, default: 0 },
    netProfit: { type: Number, required: true, default: 0 },
    profitShare20: { type: Number, required: true, default: 0 },
    actualProfit: { type: Number, required: true, default: 0 },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

DailyRevenueSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyRevenue: Model<IDailyRevenue> =
  mongoose.models.DailyRevenue || mongoose.model<IDailyRevenue>('DailyRevenue', DailyRevenueSchema);

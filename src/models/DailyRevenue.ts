import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDailyExpense {
  id: string;
  title: string;
  amount: number;
  category?: string;
}

export interface IDailyRevenue extends Document {
  userId: Types.ObjectId;
  date: string;
  plantCostPerBottle: number;
  customerBottles: number;
  customerBilledAmount: number;
  cashReceived: number;
  extraBottles: number;
  extraCash: number;
  expenses: IDailyExpense[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DailyExpenseSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'General', trim: true },
  },
  { _id: false }
);

const DailyRevenueSchema = new Schema<IDailyRevenue>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    plantCostPerBottle: { type: Number, required: true, default: 35 },
    customerBottles: { type: Number, default: 0 },
    customerBilledAmount: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    extraBottles: { type: Number, default: 0 },
    extraCash: { type: Number, default: 0 },
    expenses: [DailyExpenseSchema],
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

DailyRevenueSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyRevenue: Model<IDailyRevenue> =
  mongoose.models.DailyRevenue || mongoose.model<IDailyRevenue>('DailyRevenue', DailyRevenueSchema);

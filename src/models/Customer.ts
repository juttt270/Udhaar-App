import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICustomer extends Document {
  userId: Types.ObjectId;
  name: string;
  phone: string;
  address: string;
  area: string;
  ratePerBottle: number;
  initialBalance: number;
  depositBottles: number;
  isActive: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    area: { type: String, default: '', trim: true },
    ratePerBottle: { type: Number, required: true, default: 100 },
    initialBalance: { type: Number, default: 0 },
    depositBottles: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

CustomerSchema.index({ userId: 1, name: 1 });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', CustomerSchema);

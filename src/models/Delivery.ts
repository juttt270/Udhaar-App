import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDelivery extends Document {
  userId: Types.ObjectId;
  customerId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  bottlesDelivered: number;
  bottlesReturned: number;
  rate: number;
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    bottlesDelivered: { type: Number, required: true, default: 0, min: 0 },
    bottlesReturned: { type: Number, required: true, default: 0, min: 0 },
    rate: { type: Number, required: true, default: 100 },
    totalAmount: { type: Number, required: true, default: 0 },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

DeliverySchema.index({ customerId: 1, date: 1 }, { unique: true });
DeliverySchema.index({ userId: 1, date: 1 });

export const Delivery: Model<IDelivery> =
  mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', DeliverySchema);

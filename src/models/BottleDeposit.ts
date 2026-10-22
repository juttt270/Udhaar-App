import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBottleDeposit extends Document {
  userId: Types.ObjectId;
  customerId: Types.ObjectId;
  bottlesDeposited: number;
  securityAmount: number;
  depositDate: string;
  status: 'active' | 'refunded';
  refundDate?: string;
  refundAmount?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BottleDepositSchema = new Schema<IBottleDeposit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    bottlesDeposited: { type: Number, required: true, default: 1, min: 1 },
    securityAmount: { type: Number, required: true, min: 0 },
    depositDate: { type: String, required: true },
    status: { type: String, enum: ['active', 'refunded'], default: 'active', index: true },
    refundDate: { type: String, default: '' },
    refundAmount: { type: Number, default: 0 },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

BottleDepositSchema.index({ userId: 1, customerId: 1 });
BottleDepositSchema.index({ userId: 1, status: 1 });

export const BottleDeposit: Model<IBottleDeposit> =
  mongoose.models.BottleDeposit || mongoose.model<IBottleDeposit>('BottleDeposit', BottleDepositSchema);

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPayment extends Document {
  userId: Types.ObjectId;
  customerId: Types.ObjectId;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'Cash' | 'EasyPaisa' | 'JazzCash' | 'Bank' | 'Other';
  receiptNo?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    amount: { type: Number, required: true, min: 1 },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'EasyPaisa', 'JazzCash', 'Bank', 'Other'],
      default: 'Cash',
    },
    receiptNo: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, date: 1 });
PaymentSchema.index({ customerId: 1, date: 1 });

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

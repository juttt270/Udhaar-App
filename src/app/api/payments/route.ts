import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Payment } from '@/models/Payment';
import { Customer } from '@/models/Customer';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.userId),
    };

    if (customerId) {
      query.customerId = new mongoose.Types.ObjectId(customerId);
    }

    const payments = await Payment.find(query)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .populate('customerId', 'name phone area')
      .lean();

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: unknown) {
    console.error('Fetch payments error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch payments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { customerId, amount, paymentMethod, date, receiptNo, notes } = body;

    if (!customerId || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Customer and valid payment amount are required.' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({
      _id: customerId,
      userId: session.userId,
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const paymentDate = date || new Date().toISOString().split('T')[0];

    const payment = await Payment.create({
      userId: new mongoose.Types.ObjectId(session.userId),
      customerId: new mongoose.Types.ObjectId(customerId),
      date: paymentDate,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'Cash',
      receiptNo: receiptNo?.trim() || `REC-${Date.now().toString().slice(-6)}`,
      notes: notes?.trim() || '',
    });

    return NextResponse.json({
      success: true,
      message: `Payment of Rs. ${amount} received successfully for ${customer.name}!`,
      payment,
    });
  } catch (error: unknown) {
    console.error('Record payment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to record payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Payment ID is required.' }, { status: 400 });
    }

    await Payment.findOneAndDelete({
      _id: id,
      userId: session.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment record deleted.',
    });
  } catch (error: unknown) {
    console.error('Delete payment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

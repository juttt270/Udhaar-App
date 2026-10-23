import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { DailyRevenue, IDailyExpense } from '@/models/DailyRevenue';
import { Delivery } from '@/models/Delivery';
import { Payment } from '@/models/Payment';
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
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const userObjId = new mongoose.Types.ObjectId(session.userId);

    // 1. Calculate auto values from registered deliveries for this date
    const deliveries = await Delivery.find({ userId: userObjId, date }).lean();
    let autoBottles = 0;
    let autoBilled = 0;
    for (const d of deliveries) {
      const qty = Number(d.bottlesDelivered) || 0;
      autoBottles += qty;
      autoBilled += qty * (Number(d.rate) || 100);
    }

    // 2. Calculate auto cash received from payments for this date
    const payments = await Payment.find({ userId: userObjId, date }).lean();
    let autoCash = 0;
    for (const p of payments) {
      autoCash += Number(p.amount) || 0;
    }

    // 3. Find if a record is already saved for this date
    const saved = await DailyRevenue.findOne({ userId: userObjId, date }).lean();

    // 4. Fetch all saved entries for the history ledger (sorted by date descending)
    const history = await DailyRevenue.find({ userId: userObjId })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({
      date,
      auto: {
        bottles: autoBottles,
        billed: autoBilled,
        cash: autoCash,
      },
      saved: saved || null,
      history,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch revenue data';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      date,
      plantCostPerBottle = 35,
      bottlesSold = 0,
      actualBilled = 0,
      cashReceived = 0,
      expenses = [],
      notes = '',
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    await connectToDatabase();
    const userObjId = new mongoose.Types.ObjectId(session.userId);

    const plantCost = Math.max(Number(plantCostPerBottle) || 0, 0);
    const bottles = Math.max(Number(bottlesSold) || 0, 0);
    const billed = Math.max(Number(actualBilled) || 0, 0);
    const cash = Math.max(Number(cashReceived) || 0, 0);

    const wholesaleCost = bottles * plantCost;
    const cleanExpenses: IDailyExpense[] = Array.isArray(expenses)
      ? expenses.map((e: { id?: string; title: string; amount: number }) => ({
          id: e.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: String(e.title || '').trim(),
          amount: Math.max(Number(e.amount) || 0, 0),
        })).filter(e => e.title && e.amount > 0)
      : [];

    const totalExpenses = cleanExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = cash - wholesaleCost - totalExpenses;

    const record = await DailyRevenue.findOneAndUpdate(
      { userId: userObjId, date },
      {
        $set: {
          plantCostPerBottle: plantCost,
          bottlesSold: bottles,
          actualBilled: billed,
          cashReceived: cash,
          wholesaleCost,
          expenses: cleanExpenses,
          totalExpenses,
          netProfit,
          notes: String(notes || '').trim(),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: `Daily entry saved for ${date}!`,
      record,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save revenue record';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    await DailyRevenue.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.userId),
    });

    return NextResponse.json({ message: 'Entry deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete record';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

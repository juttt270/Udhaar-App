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

    // 1. Calculate live customer delivery totals for this date
    const deliveries = await Delivery.find({ userId: userObjId, date }).lean();
    let customerBottles = 0;
    let customerBilledAmount = 0;

    for (const d of deliveries) {
      const qty = Number(d.bottlesDelivered) || 0;
      customerBottles += qty;
      customerBilledAmount += qty * (Number(d.rate) || 100);
    }

    // 2. Calculate live cash received from payments for this date
    const payments = await Payment.find({ userId: userObjId, date }).lean();
    let cashReceived = 0;
    for (const p of payments) {
      cashReceived += Number(p.amount) || 0;
    }

    // 3. Find saved record for this date (if any)
    const savedRecord = await DailyRevenue.findOne({ userId: userObjId, date }).lean();

    const plantCostPerBottle = savedRecord?.plantCostPerBottle ?? 35;
    const extraBottles = savedRecord?.extraBottles ?? 0;
    const extraCash = savedRecord?.extraCash ?? 0;
    const expenses = savedRecord?.expenses ?? [];
    const notes = savedRecord?.notes ?? '';

    // 4. Fetch recent 30-day history for the day-wise ledger table
    const recentSaved = await DailyRevenue.find({ userId: userObjId })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const history = recentSaved.map((r) => {
      const totBottles = (r.customerBottles || 0) + (r.extraBottles || 0);
      const wholesaleCost = totBottles * (r.plantCostPerBottle || 35);
      const totalCash = (r.cashReceived || 0) + (r.extraCash || 0);
      const expSum = (r.expenses || []).reduce((sum: number, e: IDailyExpense) => sum + (Number(e.amount) || 0), 0);
      const netProfit = totalCash - wholesaleCost - expSum;

      return {
        _id: r._id,
        date: r.date,
        plantCostPerBottle: r.plantCostPerBottle,
        customerBottles: r.customerBottles || 0,
        extraBottles: r.extraBottles || 0,
        totalBottles: totBottles,
        wholesaleCost,
        cashReceived: r.cashReceived || 0,
        extraCash: r.extraCash || 0,
        totalIncome: totalCash,
        totalExpenses: expSum,
        netProfit,
        notes: r.notes || '',
      };
    });

    return NextResponse.json({
      date,
      data: {
        plantCostPerBottle,
        customerBottles,
        customerBilledAmount,
        cashReceived,
        extraBottles,
        extraCash,
        expenses,
        notes,
        isSaved: !!savedRecord,
      },
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
      plantCostPerBottle,
      customerBottles,
      customerBilledAmount,
      cashReceived,
      extraBottles,
      extraCash,
      expenses,
      notes,
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    await connectToDatabase();
    const userObjId = new mongoose.Types.ObjectId(session.userId);

    const record = await DailyRevenue.findOneAndUpdate(
      { userId: userObjId, date },
      {
        $set: {
          plantCostPerBottle: Number(plantCostPerBottle) || 35,
          customerBottles: Number(customerBottles) || 0,
          customerBilledAmount: Number(customerBilledAmount) || 0,
          cashReceived: Number(cashReceived) || 0,
          extraBottles: Math.max(Number(extraBottles) || 0, 0),
          extraCash: Math.max(Number(extraCash) || 0, 0),
          expenses: Array.isArray(expenses) ? expenses : [],
          notes: notes ? String(notes).trim() : '',
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: `Daily revenue & profit ledger saved for ${date}!`,
      record,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save revenue record';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

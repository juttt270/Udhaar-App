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

    // 1. Aggregate deliveries grouped by date for this user
    // 2. Aggregate payments grouped by date for this user
    const [deliveriesAgg, paymentsAgg] = await Promise.all([
      Delivery.aggregate([
        { $match: { userId: userObjId } },
        {
          $group: {
            _id: '$date',
            bottles: { $sum: '$bottlesDelivered' },
            billed: { $sum: '$totalAmount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { userId: userObjId } },
        {
          $group: {
            _id: '$date',
            cash: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const deliveryMap = new Map<string, { bottles: number; billed: number }>();
    for (const d of deliveriesAgg) {
      if (d._id) deliveryMap.set(d._id, { bottles: d.bottles || 0, billed: d.billed || 0 });
    }

    const paymentMap = new Map<string, number>();
    for (const p of paymentsAgg) {
      if (p._id) paymentMap.set(p._id, p.cash || 0);
    }

    // 3. Auto-sync and recalculate all existing DailyRevenue records for this user
    const allSaved = await DailyRevenue.find({ userId: userObjId });
    const bulkOps = [];

    for (const doc of allSaved) {
      const realAutoBottles = deliveryMap.get(doc.date)?.bottles || 0;
      const realAutoBilled = deliveryMap.get(doc.date)?.billed || 0;
      const realCash = paymentMap.get(doc.date) || 0;

      const extraBottles = Math.max(0, Number(doc.extraBottles) || 0);
      const extraBilled = Math.max(0, Number(doc.extraBilled) || 0);
      const plantCost = Math.max(0, Number(doc.plantCostPerBottle) || 35);
      const totalExpenses = (doc.expenses || []).reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );

      const bottlesSold = realAutoBottles + extraBottles;
      const actualBilled = realAutoBilled + extraBilled;
      const wholesaleCost = bottlesSold * plantCost;
      const netProfit = actualBilled - wholesaleCost - totalExpenses;
      const profitShare20 = Math.round(netProfit * 0.2);
      const actualProfit = netProfit - profitShare20;

      const needsUpdate =
        doc.autoBottles !== realAutoBottles ||
        doc.autoBilled !== realAutoBilled ||
        doc.bottlesSold !== bottlesSold ||
        doc.actualBilled !== actualBilled ||
        doc.cashReceived !== realCash ||
        doc.wholesaleCost !== wholesaleCost ||
        doc.netProfit !== netProfit ||
        doc.profitShare20 !== profitShare20 ||
        doc.actualProfit !== actualProfit ||
        doc.actualProfit === undefined;

      if (needsUpdate) {
        bulkOps.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                autoBottles: realAutoBottles,
                autoBilled: realAutoBilled,
                bottlesSold,
                actualBilled,
                cashReceived: realCash,
                wholesaleCost,
                totalExpenses,
                netProfit,
                profitShare20,
                actualProfit,
              },
            },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await DailyRevenue.bulkWrite(bulkOps);
    }

    // 4. Auto values for the requested date
    const autoBottles = deliveryMap.get(date)?.bottles || 0;
    const autoBilled = deliveryMap.get(date)?.billed || 0;
    const autoCash = paymentMap.get(date) || 0;

    // 5. Find if a record is already saved for this date
    const saved = await DailyRevenue.findOne({ userId: userObjId, date }).lean();

    // 6. Fetch all saved entries for the history ledger (sorted by date descending)
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
      autoBottles = 0,
      extraBottles = 0,
      bottlesSold,
      autoBilled = 0,
      extraBilled = 0,
      actualBilled,
      cashReceived,
      expenses = [],
      notes = '',
    } = body;

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    await connectToDatabase();
    const userObjId = new mongoose.Types.ObjectId(session.userId);

    const plantCost = Math.max(Number(plantCostPerBottle) || 0, 0);
    const parsedAutoBottles = Math.max(Number(autoBottles) || 0, 0);
    const parsedExtraBottles = Math.max(Number(extraBottles) || 0, 0);
    const bottles =
      bottlesSold !== undefined
        ? Math.max(Number(bottlesSold) || 0, 0)
        : parsedAutoBottles + parsedExtraBottles;

    const parsedAutoBilled = Math.max(Number(autoBilled) || 0, 0);
    const parsedExtraBilled = Math.max(Number(extraBilled) || 0, 0);
    const billed =
      actualBilled !== undefined
        ? Math.max(Number(actualBilled) || 0, 0)
        : parsedAutoBilled + parsedExtraBilled;

    // Fetch actual payments for this date to ensure cash is accurate
    const payments = await Payment.find({ userId: userObjId, date }).lean();
    const autoCashFromPayments = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cash =
      cashReceived !== undefined && Number(cashReceived) > 0
        ? Number(cashReceived)
        : autoCashFromPayments;

    const wholesaleCost = bottles * plantCost;
    const cleanExpenses: IDailyExpense[] = Array.isArray(expenses)
      ? expenses
          .map((e: { id?: string; title: string; amount: number }) => ({
            id: e.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: String(e.title || '').trim(),
            amount: Math.max(Number(e.amount) || 0, 0),
          }))
          .filter((e) => e.title && e.amount > 0)
      : [];

    const totalExpenses = cleanExpenses.reduce((sum, e) => sum + e.amount, 0);
    // Formula: Total Amount billed minus wholesale bottle cost minus other expenses
    const netProfit = billed - wholesaleCost - totalExpenses;
    const profitShare20 = Math.round(netProfit * 0.2);
    const actualProfit = netProfit - profitShare20;

    const record = await DailyRevenue.findOneAndUpdate(
      { userId: userObjId, date },
      {
        $set: {
          plantCostPerBottle: plantCost,
          autoBottles: parsedAutoBottles,
          extraBottles: parsedExtraBottles,
          bottlesSold: bottles,
          autoBilled: parsedAutoBilled,
          extraBilled: parsedExtraBilled,
          actualBilled: billed,
          cashReceived: cash,
          wholesaleCost,
          expenses: cleanExpenses,
          totalExpenses,
          netProfit,
          profitShare20,
          actualProfit,
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

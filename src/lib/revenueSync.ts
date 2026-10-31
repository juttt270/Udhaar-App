import mongoose from 'mongoose';
import { DailyRevenue } from '@/models/DailyRevenue';
import { Delivery } from '@/models/Delivery';
import { Payment } from '@/models/Payment';

/**
 * Re-syncs a DailyRevenue entry for a given user & date based on latest deliveries & payments.
 * If no DailyRevenue record exists for this date, nothing is created (user creates when ready).
 */
export async function syncDailyRevenueForDate(
  userId: string | mongoose.Types.ObjectId,
  date: string
) {
  try {
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const existing = await DailyRevenue.findOne({ userId: userObjId, date });
    if (!existing) {
      return null;
    }

    // 1. Calculate deliveries for this date
    const deliveries = await Delivery.find({ userId: userObjId, date }).lean();
    let autoBottles = 0;
    let autoBilled = 0;
    for (const d of deliveries) {
      const qty = Number(d.bottlesDelivered) || 0;
      autoBottles += qty;
      autoBilled += qty * (Number(d.rate) || 100);
    }

    // 2. Calculate payments (cash) for this date
    const payments = await Payment.find({ userId: userObjId, date }).lean();
    let autoCash = 0;
    for (const p of payments) {
      autoCash += Number(p.amount) || 0;
    }

    // 3. User overrides & settings
    const extraBottles = Math.max(0, Number(existing.extraBottles) || 0);
    const extraBilled = Math.max(0, Number(existing.extraBilled) || 0);
    const plantCost = Math.max(0, Number(existing.plantCostPerBottle) || 35);
    const totalExpenses = (existing.expenses || []).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    const bottlesSold = autoBottles + extraBottles;
    const actualBilled = autoBilled + extraBilled;
    const wholesaleCost = bottlesSold * plantCost;
    const netProfit = actualBilled - wholesaleCost - totalExpenses;
    const profitShare20 = Math.round(netProfit * 0.2);
    const actualProfit = netProfit - profitShare20;

    existing.autoBottles = autoBottles;
    existing.autoBilled = autoBilled;
    existing.bottlesSold = bottlesSold;
    existing.actualBilled = actualBilled;
    existing.cashReceived = autoCash;
    existing.wholesaleCost = wholesaleCost;
    existing.totalExpenses = totalExpenses;
    existing.netProfit = netProfit;
    existing.profitShare20 = profitShare20;
    existing.actualProfit = actualProfit;

    await existing.save();
    return existing;
  } catch (err) {
    console.error('Error syncing DailyRevenue for date:', date, err);
    return null;
  }
}

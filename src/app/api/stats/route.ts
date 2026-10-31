import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { Delivery } from '@/models/Delivery';
import { Payment } from '@/models/Payment';
import { DailyRevenue } from '@/models/DailyRevenue';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const { searchParams } = new URL(req.url);
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    const period = searchParams.get('period') || 'month'; // 'today' | 'month'
    const targetMonth = searchParams.get('month') || currentMonthPrefix;

    // Delivery & Payment date match filters based on period
    const deliveryMatch =
      period === 'today'
        ? { userId: userObjectId, date: todayStr }
        : { userId: userObjectId, date: { $regex: `^${targetMonth}` } };

    const paymentMatch =
      period === 'today'
        ? { userId: userObjectId, date: todayStr }
        : { userId: userObjectId, date: { $regex: `^${targetMonth}` } };

    const revenueMatch =
      period === 'today'
        ? { userId: userObjectId, date: todayStr }
        : { userId: userObjectId, date: { $regex: `^${targetMonth}` } };

    const [
      activeCustomersCount,
      allCustomers,
      periodDeliveriesAgg,
      periodPaymentsAgg,
      periodRevenueAgg,
      allDeliveriesAgg,
      allPaymentsAgg,
      distinctDeliveryDates,
      distinctRevenueDates,
    ] = await Promise.all([
      Customer.countDocuments({ userId: userObjectId, isActive: true }),
      Customer.find({ userId: userObjectId }).select('initialBalance').lean(),
      Delivery.aggregate([
        { $match: deliveryMatch },
        {
          $group: {
            _id: null,
            bottlesDelivered: { $sum: '$bottlesDelivered' },
            bottlesReturned: { $sum: '$bottlesReturned' },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
          },
        },
      ]),
      DailyRevenue.aggregate([
        { $match: revenueMatch },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$totalExpenses' },
            wholesaleCost: { $sum: '$wholesaleCost' },
            netProfit: { $sum: '$netProfit' },
            savedBottles: { $sum: '$bottlesSold' },
            savedBilled: { $sum: '$actualBilled' },
          },
        },
      ]),
      Delivery.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalDeliveredAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: null,
            totalReceived: { $sum: '$amount' },
          },
        },
      ]),
      Delivery.distinct('date', { userId: userObjectId }),
      DailyRevenue.distinct('date', { userId: userObjectId }),
    ]);

    const initialBalancesSum = allCustomers.reduce((sum, c) => sum + (c.initialBalance || 0), 0);
    const totalDeliveriesAmount = allDeliveriesAgg[0]?.totalDeliveredAmount || 0;
    const totalPaymentsReceived = allPaymentsAgg[0]?.totalReceived || 0;
    const totalPendingUdhaar = initialBalancesSum + totalDeliveriesAmount - totalPaymentsReceived;

    const bottlesDelivered = periodDeliveriesAgg[0]?.bottlesDelivered || 0;
    const billedAmount = periodDeliveriesAgg[0]?.totalAmount || 0;
    const collectedAmount = periodPaymentsAgg[0]?.totalPaid || 0;

    const totalExpenses = periodRevenueAgg[0]?.totalExpenses || 0;
    // Calculate wholesale cost (either from saved revenue or bottles * default 35 plant cost)
    const wholesaleCost =
      periodRevenueAgg[0]?.wholesaleCost || bottlesDelivered * 35;
    // Net profit = billed amount - bottle wholesale cost - expenses
    const netProfit = billedAmount - wholesaleCost - totalExpenses;

    // Build available months list
    const monthSet = new Set<string>();
    monthSet.add(currentMonthPrefix);

    // Add previous 6 months
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(mStr);
    }

    // Add from existing records
    [...distinctDeliveryDates, ...distinctRevenueDates].forEach((d) => {
      if (typeof d === 'string' && d.length >= 7) {
        monthSet.add(d.substring(0, 7));
      }
    });

    const availableMonths = Array.from(monthSet).sort().reverse();

    return NextResponse.json({
      success: true,
      stats: {
        period,
        selectedMonth: targetMonth,
        bottlesDelivered,
        billedAmount,
        collectedAmount,
        totalExpenses,
        wholesaleCost,
        netProfit,
        profitShare20: Math.round(netProfit * 0.20),
        actualProfit: netProfit - Math.round(netProfit * 0.20),
        activeCustomersCount,
        totalPendingUdhaar,
        availableMonths,
      },
    });
  } catch (error: unknown) {
    console.error('Stats error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

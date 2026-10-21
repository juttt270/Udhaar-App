import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { Delivery } from '@/models/Delivery';
import { Payment } from '@/models/Payment';
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

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

    const [
      activeCustomersCount,
      allCustomers,
      todayDeliveries,
      todayPayments,
      monthDeliveriesAgg,
      monthPaymentsAgg,
      allDeliveriesAgg,
      allPaymentsAgg,
    ] = await Promise.all([
      Customer.countDocuments({ userId: userObjectId, isActive: true }),
      Customer.find({ userId: userObjectId }).select('initialBalance').lean(),
      Delivery.aggregate([
        { $match: { userId: userObjectId, date: todayStr } },
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
        { $match: { userId: userObjectId, date: todayStr } },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
          },
        },
      ]),
      Delivery.aggregate([
        { $match: { userId: userObjectId, date: { $regex: `^${currentMonthPrefix}` } } },
        {
          $group: {
            _id: null,
            totalBottles: { $sum: '$bottlesDelivered' },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { userId: userObjectId, date: { $regex: `^${currentMonthPrefix}` } } },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
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
    ]);

    const initialBalancesSum = allCustomers.reduce((sum, c) => sum + (c.initialBalance || 0), 0);
    const totalDeliveriesAmount = allDeliveriesAgg[0]?.totalDeliveredAmount || 0;
    const totalPaymentsReceived = allPaymentsAgg[0]?.totalReceived || 0;
    const totalPendingUdhaar = initialBalancesSum + totalDeliveriesAmount - totalPaymentsReceived;

    return NextResponse.json({
      success: true,
      stats: {
        today: {
          date: todayStr,
          bottlesDelivered: todayDeliveries[0]?.bottlesDelivered || 0,
          bottlesReturned: todayDeliveries[0]?.bottlesReturned || 0,
          billedAmount: todayDeliveries[0]?.totalAmount || 0,
          cashReceived: todayPayments[0]?.totalPaid || 0,
        },
        month: {
          monthStr: currentMonthPrefix,
          totalBottles: monthDeliveriesAgg[0]?.totalBottles || 0,
          billedAmount: monthDeliveriesAgg[0]?.totalAmount || 0,
          collectedAmount: monthPaymentsAgg[0]?.totalPaid || 0,
        },
        activeCustomersCount,
        totalPendingUdhaar,
      },
    });
  } catch (error: unknown) {
    console.error('Stats error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

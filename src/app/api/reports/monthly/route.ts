import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { Delivery } from '@/models/Delivery';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
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
    const month = searchParams.get('month'); // Format: YYYY-MM

    if (!customerId || !month) {
      return NextResponse.json(
        { error: 'customerId and month (YYYY-MM) are required parameters.' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const customerObjectId = new mongoose.Types.ObjectId(customerId);

    const [user, customer] = await Promise.all([
      User.findById(userObjectId).select('-password').lean(),
      Customer.findOne({ _id: customerObjectId, userId: userObjectId }).lean(),
    ]);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
    }

    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`;

    // 1. Calculate Previous Balance (Deliveries & Payments strictly before monthStart)
    const [prevDeliveries, prevPayments] = await Promise.all([
      Delivery.aggregate([
        {
          $match: {
            customerId: customerObjectId,
            date: { $lt: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$totalAmount' },
            totalDelivered: { $sum: '$bottlesDelivered' },
            totalReturned: { $sum: '$bottlesReturned' },
          },
        },
      ]),
      Payment.aggregate([
        {
          $match: {
            customerId: customerObjectId,
            date: { $lt: monthStart },
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const prevBilled = prevDeliveries[0]?.totalBilled || 0;
    const prevPaid = prevPayments[0]?.totalPaid || 0;
    const openingBalance = (customer.initialBalance || 0) + prevBilled - prevPaid;

    // 2. Fetch deliveries for the specified month
    const monthDeliveries = await Delivery.find({
      customerId: customerObjectId,
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ date: 1 })
      .lean();

    // 3. Fetch payments for the specified month
    const monthPayments = await Payment.find({
      customerId: customerObjectId,
      date: { $gte: monthStart, $lte: monthEnd },
    })
      .sort({ date: 1 })
      .lean();

    // 4. Summarize Month Activity
    const monthBottlesDelivered = monthDeliveries.reduce((sum, d) => sum + (d.bottlesDelivered || 0), 0);
    const monthBottlesReturned = monthDeliveries.reduce((sum, d) => sum + (d.bottlesReturned || 0), 0);
    const monthBilling = monthDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
    const monthPaymentsTotal = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const closingBalance = openingBalance + monthBilling - monthPaymentsTotal;

    // 5. Total Bottles with Customer
    const [allDeliveriesAgg] = await Delivery.aggregate([
      { $match: { customerId: customerObjectId } },
      {
        $group: {
          _id: null,
          totalDelivered: { $sum: '$bottlesDelivered' },
          totalReturned: { $sum: '$bottlesReturned' },
        },
      },
    ]);

    const totalAllTimeDelivered = allDeliveriesAgg?.totalDelivered || 0;
    const totalAllTimeReturned = allDeliveriesAgg?.totalReturned || 0;
    const totalBottlesWithCustomer =
      (customer.depositBottles || 0) + totalAllTimeDelivered - totalAllTimeReturned;

    return NextResponse.json({
      success: true,
      report: {
        month,
        generatedAt: new Date().toISOString(),
        plant: {
          name: user?.plantName || 'Water Plant',
          phone: user?.phone || '',
          address: user?.address || '',
          currency: user?.currency || 'Rs.',
        },
        customer: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          area: customer.area,
          ratePerBottle: customer.ratePerBottle,
        },
        openingBalance,
        monthDeliveries,
        monthPayments,
        monthBottlesDelivered,
        monthBottlesReturned,
        monthBilling,
        monthPaymentsTotal,
        closingBalance,
        totalBottlesWithCustomer,
      },
    });
  } catch (error: unknown) {
    console.error('Monthly report error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate monthly report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

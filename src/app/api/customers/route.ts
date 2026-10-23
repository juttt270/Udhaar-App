import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Customer } from '@/models/Customer';
import { BottleDeposit } from '@/models/BottleDeposit';
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
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // 'active', 'inactive', 'all'

    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    const query: Record<string, unknown> = { userId: userObjectId };
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { area: regex }, { address: regex }];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    // Calculate balances for each customer via aggregations
    const customerIds = customers.map((c) => c._id);

    const [deliveryTotals, paymentTotals] = await Promise.all([
      Delivery.aggregate([
        { $match: { customerId: { $in: customerIds } } },
        {
          $group: {
            _id: '$customerId',
            totalBilled: { $sum: '$totalAmount' },
            totalDelivered: { $sum: '$bottlesDelivered' },
            totalReturned: { $sum: '$bottlesReturned' },
          },
        },
      ]),
      Payment.aggregate([
        { $match: { customerId: { $in: customerIds } } },
        {
          $group: {
            _id: '$customerId',
            totalPaid: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const deliveryMap = new Map<string, { totalBilled: number; totalDelivered: number; totalReturned: number }>();
    deliveryTotals.forEach((item) => {
      deliveryMap.set(item._id.toString(), {
        totalBilled: item.totalBilled || 0,
        totalDelivered: item.totalDelivered || 0,
        totalReturned: item.totalReturned || 0,
      });
    });

    const paymentMap = new Map<string, number>();
    paymentTotals.forEach((item) => {
      paymentMap.set(item._id.toString(), item.totalPaid || 0);
    });

    const customersWithBalance = customers.map((customer) => {
      const idStr = customer._id.toString();
      const delStats = deliveryMap.get(idStr) || { totalBilled: 0, totalDelivered: 0, totalReturned: 0 };
      const totalPaid = paymentMap.get(idStr) || 0;

      const initialBal = customer.initialBalance || 0;
      const currentBalance = initialBal + delStats.totalBilled - totalPaid;
      const bottlesWithCustomer = (customer.depositBottles || 0) + delStats.totalDelivered - delStats.totalReturned;

      return {
        ...customer,
        totalBilled: delStats.totalBilled,
        totalPaid,
        currentBalance,
        bottlesWithCustomer,
      };
    });

    return NextResponse.json({
      success: true,
      customers: customersWithBalance,
    });
  } catch (error: unknown) {
    console.error('Fetch customers error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch customers';
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
    const { name, phone, address, area, ratePerBottle, initialBalance, depositBottles, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    }

    const newCustomer = await Customer.create({
      userId: new mongoose.Types.ObjectId(session.userId),
      name: name.trim(),
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      area: area?.trim() || '',
      ratePerBottle: Number(ratePerBottle) > 0 ? Number(ratePerBottle) : 100,
      initialBalance: Number(initialBalance) || 0,
      depositBottles: Number(depositBottles) >= 0 ? Number(depositBottles) : 1,
      isActive: true,
      notes: notes?.trim() || '',
    });

    // Auto-link with Bottle Security module
    const secAmt = Number(body.securityAmount) || 0;
    const depBottles = Number(depositBottles) >= 0 ? Number(depositBottles) : 1;
    if (secAmt > 0 || depBottles > 0) {
      await BottleDeposit.create({
        userId: new mongoose.Types.ObjectId(session.userId),
        customerId: newCustomer._id,
        bottlesDeposited: depBottles || 1,
        securityAmount: secAmt,
        depositDate: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: 'Initial bottle deposit on customer registration',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer added successfully!',
      customer: newCustomer,
    });
  } catch (error: unknown) {
    console.error('Create customer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { id, name, phone, address, area, ratePerBottle, initialBalance, depositBottles, isActive, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
    }

    const updated = await Customer.findOneAndUpdate(
      { _id: id, userId: session.userId },
      {
        name: name?.trim(),
        phone: phone?.trim(),
        address: address?.trim(),
        area: area?.trim(),
        ratePerBottle: Number(ratePerBottle) || 100,
        initialBalance: Number(initialBalance) || 0,
        depositBottles: Number(depositBottles) || 0,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        notes: notes?.trim(),
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Customer not found or unauthorized.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer updated successfully!',
      customer: updated,
    });
  } catch (error: unknown) {
    console.error('Update customer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update customer';
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
      return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
    }

    await Customer.findOneAndDelete({ _id: id, userId: session.userId });
    await Delivery.deleteMany({ customerId: id });
    await Payment.deleteMany({ customerId: id });

    return NextResponse.json({
      success: true,
      message: 'Customer and all associated records deleted successfully.',
    });
  } catch (error: unknown) {
    console.error('Delete customer error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete customer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

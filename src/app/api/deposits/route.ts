import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { BottleDeposit } from '@/models/BottleDeposit';
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
    // Ensure Customer model is registered for populate
    void Customer;

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.userId),
    };

    if (customerId) {
      query.customerId = new mongoose.Types.ObjectId(customerId);
    }
    if (status && ['active', 'refunded'].includes(status)) {
      query.status = status;
    }

    const deposits = await BottleDeposit.find(query)
      .sort({ depositDate: -1, createdAt: -1 })
      .populate('customerId', 'name phone area')
      .lean();

    // Summary stats for active deposits
    const allUserDeposits = await BottleDeposit.find({
      userId: new mongoose.Types.ObjectId(session.userId),
    }).lean();

    let totalSecurityHeld = 0;
    let totalDepositBottles = 0;
    let activeCount = 0;
    let refundedCount = 0;

    for (const d of allUserDeposits) {
      if (d.status === 'active') {
        totalSecurityHeld += Number(d.securityAmount) || 0;
        totalDepositBottles += Number(d.bottlesDeposited) || 0;
        activeCount++;
      } else {
        refundedCount++;
      }
    }

    return NextResponse.json({
      deposits,
      stats: {
        totalSecurityHeld,
        totalDepositBottles,
        activeCount,
        refundedCount,
        totalRecords: allUserDeposits.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch deposits';
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
    const { customerId, bottlesDeposited, securityAmount, depositDate, notes } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer is required' }, { status: 400 });
    }
    if (securityAmount === undefined || Number(securityAmount) < 0) {
      return NextResponse.json({ error: 'Valid security deposit amount is required' }, { status: 400 });
    }

    await connectToDatabase();

    const deposit = await BottleDeposit.create({
      userId: new mongoose.Types.ObjectId(session.userId),
      customerId: new mongoose.Types.ObjectId(customerId),
      bottlesDeposited: Math.max(Number(bottlesDeposited) || 1, 1),
      securityAmount: Number(securityAmount),
      depositDate: depositDate || new Date().toISOString().split('T')[0],
      status: 'active',
      notes: notes ? String(notes).trim() : '',
    });

    return NextResponse.json(
      { message: 'Security deposit recorded successfully!', deposit },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record deposit';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, refundDate, refundAmount, bottlesDeposited, securityAmount, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Deposit ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const deposit = await BottleDeposit.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.userId),
    });

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit record not found' }, { status: 404 });
    }

    if (action === 'refund') {
      deposit.status = 'refunded';
      deposit.refundDate = refundDate || new Date().toISOString().split('T')[0];
      deposit.refundAmount = Number(refundAmount) !== undefined ? Number(refundAmount) : deposit.securityAmount;
      if (notes) deposit.notes = `${deposit.notes ? deposit.notes + ' | ' : ''}Refunded: ${notes}`;
      await deposit.save();
      return NextResponse.json({ message: 'Security deposit refunded successfully!', deposit });
    }

    // Regular edit
    if (bottlesDeposited !== undefined) deposit.bottlesDeposited = Math.max(Number(bottlesDeposited), 1);
    if (securityAmount !== undefined) deposit.securityAmount = Number(securityAmount);
    if (notes !== undefined) deposit.notes = String(notes).trim();

    await deposit.save();
    return NextResponse.json({ message: 'Deposit record updated successfully!', deposit });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update deposit';
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
      return NextResponse.json({ error: 'Deposit ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await BottleDeposit.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.userId),
    });

    if (!result) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Security deposit record deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete deposit';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

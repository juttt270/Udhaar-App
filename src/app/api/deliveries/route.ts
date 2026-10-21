import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { Delivery } from '@/models/Delivery';
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
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required (YYYY-MM-DD).' }, { status: 400 });
    }

    const deliveries = await Delivery.find({
      userId: new mongoose.Types.ObjectId(session.userId),
      date,
    }).lean();

    return NextResponse.json({
      success: true,
      deliveries,
    });
  } catch (error: unknown) {
    console.error('Fetch deliveries error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch deliveries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface DeliveryInputItem {
  customerId: string;
  bottlesDelivered: number;
  bottlesReturned?: number;
  rate?: number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { date, entries } = body as { date: string; entries: DeliveryInputItem[] };

    if (!date || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Date (YYYY-MM-DD) and entries array are required.' },
        { status: 400 }
      );
    }

    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const bulkOps = [];

    for (const entry of entries) {
      if (!entry.customerId) continue;

      const customerObjectId = new mongoose.Types.ObjectId(entry.customerId);
      const delivered = Math.max(0, Number(entry.bottlesDelivered) || 0);
      const returned = Math.max(0, Number(entry.bottlesReturned) || 0);
      const rate = Math.max(0, Number(entry.rate) || 100);
      const totalAmount = delivered * rate;

      if (delivered === 0 && returned === 0 && !entry.notes) {
        // If 0 delivered & 0 returned, delete any existing record for this day
        bulkOps.push({
          deleteOne: {
            filter: { customerId: customerObjectId, date },
          },
        });
      } else {
        bulkOps.push({
          updateOne: {
            filter: { customerId: customerObjectId, date },
            update: {
              $set: {
                userId: userObjectId,
                customerId: customerObjectId,
                date,
                bottlesDelivered: delivered,
                bottlesReturned: returned,
                rate,
                totalAmount,
                notes: entry.notes?.trim() || '',
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Delivery.bulkWrite(bulkOps);
    }

    // Return updated totals for the date
    const updatedDeliveries = await Delivery.find({
      userId: userObjectId,
      date,
    }).lean();

    const totalBottles = updatedDeliveries.reduce((sum, d) => sum + (d.bottlesDelivered || 0), 0);
    const totalAmount = updatedDeliveries.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Daily entries saved for ${date}! Total: ${totalBottles} bottles (Rs. ${totalAmount})`,
      deliveries: updatedDeliveries,
      totalBottles,
      totalAmount,
    });
  } catch (error: unknown) {
    console.error('Save deliveries error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save daily entries';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

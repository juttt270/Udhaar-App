import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { authenticateRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(new mongoose.Types.ObjectId(session.userId)).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings: user });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { plantName, phone, address, currency, defaultRate, newPassword } = body;

    const updateFields: Record<string, unknown> = {};
    if (plantName) updateFields.plantName = plantName.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (address !== undefined) updateFields.address = address.trim();
    if (currency) updateFields.currency = currency.trim();
    if (defaultRate) updateFields.defaultRate = Number(defaultRate);

    if (newPassword && newPassword.trim().length >= 6) {
      updateFields.password = await hashPassword(newPassword.trim());
    }

    const updated = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(session.userId),
      { $set: updateFields },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully!',
      settings: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

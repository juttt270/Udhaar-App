import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check if any user exists in database
    const totalUsers = await User.countDocuments();
    const hasAnyAdmin = totalUsers > 0;

    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        hasAnyAdmin,
        user: null,
      });
    }

    const user = await User.findById(session.userId).select('-password');
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        hasAnyAdmin,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      hasAnyAdmin,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plantName: user.plantName,
        phone: user.phone,
        address: user.address,
        currency: user.currency,
        defaultRate: user.defaultRate,
      },
    });
  } catch (error: unknown) {
    console.error('Session check error:', error);
    const message = error instanceof Error ? error.message : 'Session verification failed';
    return NextResponse.json({ error: message, authenticated: false }, { status: 500 });
  }
}

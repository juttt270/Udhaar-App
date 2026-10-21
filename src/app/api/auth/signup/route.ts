import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, email, password, plantName, phone, address, defaultRate } = body;

    if (!name || !email || !password || !plantName) {
      return NextResponse.json(
        { error: 'Name, email, password, and water plant name are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      plantName: plantName.trim(),
      phone: phone?.trim() || '',
      address: address?.trim() || '',
      defaultRate: Number(defaultRate) || 100,
    });

    const token = await signToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      name: newUser.name,
      plantName: newUser.plantName,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Plant account created successfully!',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        plantName: newUser.plantName,
        phone: newUser.phone,
        defaultRate: newUser.defaultRate,
      },
    });

    setAuthCookie(response, token);
    return response;
  } catch (error: unknown) {
    console.error('Signup error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

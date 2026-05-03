import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.AUTH_USER;
    const expectedPwd = process.env.AUTH_PASS;

    if (!expectedUser || !expectedPwd) {
      return NextResponse.json(
        { error: 'Server authentication not configured properly.' },
        { status: 500 }
      );
    }

    if (username === expectedUser && password === expectedPwd) {
      // Create a simple secure token based on credentials
      const token = Buffer.from(`${expectedUser}:${expectedPwd}`).toString('base64');
      
      // Set HTTP-only cookie
      const cookieStore = await cookies();
      cookieStore.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

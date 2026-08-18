import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.frankfurter.app/currencies');

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Currency API unavailable' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const currencies = Object.entries(data || {})
      .map(([code, name]) => ({
        code,
        name: typeof name === 'string' ? name : code,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ success: true, data: currencies });
  } catch (error) {
    console.error('Currency API proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load currencies' },
      { status: 500 }
    );
  }
}

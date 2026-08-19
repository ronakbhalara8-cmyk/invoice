import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request) {
    const token = request.cookies.get('token')?.value;
    if (!token) {
        return NextResponse.json({ error: true, message: 'Authentication required.' }, { status: 401 });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { organizationId } = await request.json().catch(() => ({}));

        if (!organizationId) {
            return NextResponse.json({ error: true, message: 'Organization is required.' }, { status: 400 });
        }

        const organization = await db.query(
            'SELECT id, name FROM organizations WHERE id = $1 AND user_id = $2',
            [organizationId, decoded.userId]
        );

        if (organization.rows.length === 0) {
            return NextResponse.json({ error: true, message: 'Organization not found.' }, { status: 404 });
        }

        const nextToken = jwt.sign(
            {
                userId: decoded.userId,
                email: decoded.email,
                companyName: decoded.companyName,
                organizationId: organization.rows[0].id,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        const response = NextResponse.json({ error: false, data: organization.rows[0] });
        response.cookies.set({
            name: 'token',
            value: nextToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 86400,
            path: '/',
        });
        return response;
    } catch (error) {
        console.error('Select organization error:', error);
        return NextResponse.json({ error: true, message: 'Unable to select organization.' }, { status: 401 });
    }
}

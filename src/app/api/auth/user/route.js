import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request) {
    try {
        // Get token from cookie
        const token = request.cookies.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: true, message: 'No token provided' },
                { status: 401 }
            );
        }

        // Verify and decode token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return NextResponse.json(
                { error: true, message: 'Invalid token' },
                { status: 401 }
            );
        }

        const { userId } = decoded;

        if (!userId) {
            return NextResponse.json(
                { error: true, message: 'Invalid token payload' },
                { status: 401 }
            );
        }

        // Fetch user from database
        const client = await db.connect();

        try {
            const userQuery = `
        SELECT 
          id, 
          email, 
          company_name, 
          phone, 
          country, 
          country_code, 
          state,
          created_at
        FROM users 
        WHERE id = $1
      `;

            const userResult = await client.query(userQuery, [userId]);

            if (userResult.rows.length === 0) {
                return NextResponse.json(
                    { error: true, message: 'User not found' },
                    { status: 404 }
                );
            }

            const user = userResult.rows[0];

            // Fetch organization if exists
            const orgQuery = `
        SELECT id, name 
        FROM organizations 
        WHERE user_id = $1 
        LIMIT 1
      `;

            const orgResult = await client.query(orgQuery, [userId]);
            const organization = orgResult.rows[0];

            return NextResponse.json({
                error: false,
                data: {
                    userId: user.id,
                    email: user.email,
                    companyName: user.company_name,
                    phone: user.phone,
                    country: user.country,
                    countryCode: user.country_code,
                    state: user.state,
                    organizationName: organization?.name || user.company_name,
                    organizationId: organization?.id || null,
                    createdAt: user.created_at,
                },
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: true, message: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}

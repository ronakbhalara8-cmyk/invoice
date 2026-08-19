// app/api/auth/login/route.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email?.trim() || !password?.trim()) {
            return NextResponse.json(
                { error: true, message: 'Email and password are required.' },
                { status: 400 }
            );
        }

        const client = await db.connect();

        try {
            // Find user by email
            const userQuery = `
                SELECT id, company_name, username, email, password_hash, country, country_code, state, phone
                FROM users 
                WHERE LOWER(email) = LOWER($1) 
                LIMIT 1;
            `;
            const userResult = await client.query(userQuery, [email.trim()]);

            if (userResult.rows.length === 0) {
                return NextResponse.json(
                    { error: true, message: 'Invalid email or password.' },
                    { status: 401 }
                );
            }

            const user = userResult.rows[0];

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return NextResponse.json(
                    { error: true, message: 'Invalid email or password.' },
                    { status: 401 }
                );
            }

            // Fetch all organizations for post-login routing.
            const orgQuery = 'SELECT id, name FROM organizations WHERE user_id = $1 ORDER BY created_at ASC, id ASC;';
            const orgResult = await client.query(orgQuery, [user.id]);
            const organizations = orgResult.rows;
            const organizationId = organizations[0]?.id || null;

            // Create JWT token
            const token = createToken({
                userId: user.id,
                organizationId,
                email: user.email,
                companyName: user.company_name,
                username: user.username,
            });

            const response = NextResponse.json(
                {
                    error: false,
                    data: {
                        userId: user.id,
                        organizationId,
                        companyName: user.company_name,
                        username: user.username,
                        email: user.email,
                        organizations,
                    },
                    message: 'Login successful.',
                },
                { status: 200 }
            );

            // Set secure HTTP-only cookie
            response.cookies.set({
                name: 'token',
                value: token,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 86400, // 24 hours
                path: '/',
            });

            return response;

        } catch (dbError) {
            console.error('Login DB error:', dbError);
            return NextResponse.json(
                { error: true, message: 'An error occurred during login.' },
                { status: 500 }
            );
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Login API Error:', error);
        return NextResponse.json(
            { error: true, message: 'Unable to complete login at this time.' },
            { status: 500 }
        );
    }
}
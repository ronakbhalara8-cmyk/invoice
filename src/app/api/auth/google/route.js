import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString('utf8')
                .split('')
                .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Google token decode error:', error);
        return null;
    }
}

function getErrorMessage(error) {
    if (error?.code === '23505' && error?.constraint?.includes('email')) {
        return 'Email already exists. Please use another email.';
    }

    return 'Unable to complete Google registration at this time.';
}

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            idToken,
            companyName,
            phone,
            country,
            countryCode,
            state,
        } = body;

        const payload = idToken ? decodeJwtPayload(idToken) : null;
        const email = payload?.email || body.email?.trim();
        const safeCompanyName = companyName?.trim();
        if (!email?.trim()) {
            return new Response(
                JSON.stringify({
                    error: true,
                    message: 'Email is required.',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        const client = await db.connect();

        try {
            // Check if user already exists
            const existingUser = await client.query(
                'SELECT id, company_name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
                [email.trim()]
            );

            // If user exists, login directly
            if (existingUser.rows.length > 0) {
                const userId = existingUser.rows[0].id;

                // Fetch all organizations for post-login routing.
                const orgQuery = 'SELECT id, name FROM organizations WHERE user_id = $1 ORDER BY created_at ASC, id ASC;';
                const orgResult = await client.query(orgQuery, [userId]);
                const organizations = orgResult.rows;
                const organizationId = organizations[0]?.id || null;

                // Create JWT token
                const token = createToken({
                    userId,
                    organizationId,
                    email: email.trim(),
                });

                const response = NextResponse.json(
                    {
                        error: false,
                        data: { userId, organizationId, organizations },
                        message: 'Login successful. Redirecting to dashboard.',
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
            }

            // User doesn't exist - check if we have required fields for registration
            if (!phone?.trim() || !country?.trim() || !countryCode?.trim()) {
                return new Response(
                    JSON.stringify({
                        error: true,
                        message: 'User not found. Please complete registration.',
                        requiresRegistration: true,
                    }),
                    {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            await client.query('BEGIN');
            const passwordHash = await bcrypt.hash(`${email.trim()}:${Date.now()}:${Math.random()}`, 12);

            // Create user
            const userQuery = `
                INSERT INTO users (
                    company_name,
                    phone,
                    email,
                    password_hash,
                    country,
                    country_code,
                    state,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING id;
            `;

            const userValues = [
                safeCompanyName,
                phone.trim(),
                email.trim(),
                passwordHash,
                country.trim(),
                countryCode.trim(),
                country === 'India' ? state?.trim() || null : null,
            ];

            const userResult = await client.query(userQuery, userValues);
            const userId = userResult.rows[0]?.id;

            await client.query('COMMIT');

            // Create JWT token (without organizationId initially - user needs to complete organization setup)
            const token = createToken({
                userId,
                organizationId: null,
                email: email.trim(),
            });

            const response = NextResponse.json(
                {
                    error: false,
                    data: { userId },
                    message: 'Google registration completed. Please complete organization setup.',
                },
                { status: 201 }
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
            await client.query('ROLLBACK');
            console.error('Google registration DB error:', dbError);

            return new Response(
                JSON.stringify({
                    error: true,
                    message: getErrorMessage(dbError),
                }),
                {
                    status: dbError?.code === '23505' ? 409 : 500,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Google registration API Error:', error);

        return new Response(
            JSON.stringify({
                error: true,
                message: 'Unable to complete Google registration at this time.',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

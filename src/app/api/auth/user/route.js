import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getAuthenticatedUser(request) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
        return { error: NextResponse.json({ error: true, message: 'No token provided' }, { status: 401 }) };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded?.userId) {
            return { error: NextResponse.json({ error: true, message: 'Invalid token payload' }, { status: 401 }) };
        }
        return { userId: decoded.userId, organizationId: decoded.organizationId || null };
    } catch (error) {
        return { error: NextResponse.json({ error: true, message: 'Invalid token' }, { status: 401 }) };
    }
}

export async function GET(request) {
    try {
        const auth = getAuthenticatedUser(request);
        if (auth.error) {
            return auth.error;
        }

        const { userId, organizationId } = auth;
        const client = await db.connect();

        try {
            const userQuery = `
        SELECT 
          id, 
          email, 
          company_name, 
          username,
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

            const orgQuery = `
        SELECT id, name, gst_number
        FROM organizations
        WHERE user_id = $1
        ORDER BY created_at ASC, id ASC
      `;

            const orgResult = await client.query(orgQuery, [userId]);
            const organization = orgResult.rows.find((org) => String(org.id) === String(organizationId)) || orgResult.rows[0];

            return NextResponse.json({
                error: false,
                data: {
                    userId: user.id,
                    email: user.email,
                    companyName: user.company_name,
                    username: user.username,
                    phone: user.phone,
                    country: user.country,
                    countryCode: user.country_code,
                    state: user.state,
                    organizationName: organization?.name || user.company_name,
                    gstNumber: organization?.gst_number || '',
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

export async function PUT(request) {
    try {
        const auth = getAuthenticatedUser(request);
        if (auth.error) {
            return auth.error;
        }

        const { userId, organizationId } = auth;
        const body = await request.json().catch(() => ({}));

        if (!body || typeof body !== 'object') {
            return NextResponse.json(
                { error: true, message: 'Invalid profile payload.' },
                { status: 400 }
            );
        }

        const updates = [];
        const values = [];
        let index = 1;

        const normalizeOptionalText = (value) => {
            if (value === undefined || value === null) return undefined;
            const trimmed = String(value).trim();
            return trimmed === '' ? null : trimmed;
        };

        const pushUpdate = (column, value) => {
            updates.push(`${column} = $${index}`);
            values.push(value);
            index += 1;
        };

        if ('companyName' in body) {
            const companyName = normalizeOptionalText(body.companyName);
            if (companyName === null) {
                return NextResponse.json({ error: true, message: 'Company name cannot be empty.' }, { status: 400 });
            }
            pushUpdate('company_name', companyName);
        }

        if ('username' in body) {
            const username = normalizeOptionalText(body.username);
            if (username === null) {
                return NextResponse.json({ error: true, message: 'Username cannot be empty.' }, { status: 400 });
            }
            pushUpdate('username', username);
        }

        if ('phone' in body) {
            const phone = normalizeOptionalText(body.phone);
            if (phone !== null && phone !== undefined && phone !== '') {
                pushUpdate('phone', phone);
            }
        }

        if ('country' in body) {
            pushUpdate('country', normalizeOptionalText(body.country) ?? null);
        }

        if ('countryCode' in body) {
            pushUpdate('country_code', normalizeOptionalText(body.countryCode) ?? null);
        }

        if ('state' in body) {
            pushUpdate('state', normalizeOptionalText(body.state) ?? null);
        }

        if ('password' in body) {
            const password = String(body.password ?? '').trim();
            if (!password) {
                return NextResponse.json({ error: true, message: 'Password cannot be empty.' }, { status: 400 });
            }
            if (password.length < 6) {
                return NextResponse.json({ error: true, message: 'Password must be at least 6 characters long.' }, { status: 400 });
            }
            pushUpdate('password_hash', await bcrypt.hash(password, 12));
        }

        let organizationNameForUpdate = null;
        let gstNumberForUpdate = null;

        if ('organizationName' in body) {
            const organizationName = normalizeOptionalText(body.organizationName);
            if (organizationName === null) {
                return NextResponse.json({ error: true, message: 'Organization name cannot be empty.' }, { status: 400 });
            }
            organizationNameForUpdate = organizationName;
        }

        if ('gstNumber' in body) {
            gstNumberForUpdate = normalizeOptionalText(body.gstNumber) ?? null;
        }

        if (organizationNameForUpdate !== null || gstNumberForUpdate !== null) {
            const client = await db.connect();
            try {
                await client.query('BEGIN');

                const existingOrg = await client.query(
                    'SELECT id FROM organizations WHERE user_id = $1 AND ($2::int IS NULL OR id = $2) ORDER BY created_at ASC, id ASC LIMIT 1',
                    [userId, organizationId]
                );

                const finalOrgName = organizationNameForUpdate ?? existingOrg.rows[0]?.name ?? null;
                const finalGstNumber = gstNumberForUpdate ?? existingOrg.rows[0]?.gst_number ?? null;

                if (existingOrg.rows.length > 0) {
                    await client.query(
                        'UPDATE organizations SET name = $1, gst_number = $2 WHERE id = $3 AND user_id = $4',
                        [finalOrgName, finalGstNumber, existingOrg.rows[0].id, userId]
                    );
                } else {
                    await client.query(
                        'INSERT INTO organizations (user_id, name, gst_number, created_at) VALUES ($1, $2, $3, NOW())',
                        [userId, finalOrgName, finalGstNumber]
                    );
                }

                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { error: true, message: 'No profile fields to update.' },
                { status: 400 }
            );
        }

        const client = await db.connect();

        try {
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${index}`;
            await client.query(query, [...values, userId]);

            const userQuery = `
                SELECT 
                  id,
                  email,
                  company_name,
                  username,
                  phone,
                  country,
                  country_code,
                  state
                FROM users
                WHERE id = $1
            `;

            const userResult = await client.query(userQuery, [userId]);
            const user = userResult.rows[0];

            const orgQuery = 'SELECT id, name, gst_number FROM organizations WHERE user_id = $1 ORDER BY created_at ASC, id ASC';
            const orgResult = await client.query(orgQuery, [userId]);
            const org = orgResult.rows.find((item) => String(item.id) === String(organizationId)) || orgResult.rows[0];

            return NextResponse.json({
                error: false,
                data: {
                    userId: user.id,
                    email: user.email,
                    companyName: user.company_name,
                    username: user.username,
                    phone: user.phone,
                    country: user.country,
                    countryCode: user.country_code,
                    state: user.state,
                    organizationName: org?.name || user.company_name,
                    gstNumber: org?.gst_number || '',
                    organizationId: org?.id || null,
                    organizations: orgResult.rows,
                },
                message: 'Profile updated successfully.'
            });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Update user profile error:', error);
        return NextResponse.json(
            { error: true, message: 'Failed to update profile.' },
            { status: 500 }
        );
    }
}

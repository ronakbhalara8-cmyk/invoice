import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from '../../../lib/db';

export async function POST(request) {
    try {
        const body = await request.json();
        const { registration, organization } = body || {};

        if (!registration || !organization) {
            return new Response(
                JSON.stringify({ error: true, message: 'Invalid payload.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const {
            companyName: regCompanyName,
            phone,
            email,
            password,
            country,
            countryCode,
            state,
            via,
            name,
        } = registration;

        const companyName = (regCompanyName && regCompanyName.trim()) || (name && name.trim()) || (email && email.trim()) || null;

        if (!email || !companyName) {
            return new Response(
                JSON.stringify({ error: true, message: 'Missing required registration fields.' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Prepare password hash: only store a hash when a password was provided
        const passwordHash = password ? await bcrypt.hash(password, 12) : null;

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const existingUser = await client.query(
                'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
                [email.trim()]
            );

            if (existingUser.rows.length > 0) {
                await client.query('ROLLBACK');
                return new Response(
                    JSON.stringify({ error: true, message: 'Email already exists. Please use another email.' }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const insertUserQuery = `
        INSERT INTO users (
          company_name, phone, email, password_hash, country, country_code, state, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id;
      `;

            const userValues = [
                companyName,
                phone?.trim() || null,
                email?.trim(),
                passwordHash,
                country || null,
                countryCode || null,
                state && state.trim() ? state.trim() : null,
            ];

            const userRes = await client.query(insertUserQuery, userValues);
            const userId = userRes.rows[0]?.id;

            const insertOrgQuery = `
        INSERT INTO organizations (
          user_id, name, industry, country, state, country_name, state_name, currency, language, timezone, gst_registered, gst_number, address, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING id;
      `;

            const orgValues = [
                userId,
                organization.organizationName || null,
                organization.industry || null,
                organization.country || null,
                organization.state || null,
                organization.countryName || null,
                organization.stateName || null,
                organization.currency || null,
                organization.language || null,
                organization.timezone || null,
                organization.gstRegistered === 'yes',
                organization.gstNumber || null,
                organization.address || null,
            ];

            const orgRes = await client.query(insertOrgQuery, orgValues);

            await client.query('COMMIT');

            return new Response(
                JSON.stringify({ error: false, data: { userId, orgId: orgRes.rows[0]?.id }, message: 'Registration completed.' }),
                { status: 201, headers: { 'Content-Type': 'application/json' } }
            );
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Complete registration error:', err);

            if (err.code === '23505' && err.constraint?.includes('email')) {
                return new Response(
                    JSON.stringify({ error: true, message: 'Email already exists. Please use another email.' }),
                    { status: 409, headers: { 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ error: true, message: 'Failed to complete registration.' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Complete registration handler error:', error);
        return new Response(
            JSON.stringify({ error: true, message: 'Invalid request.' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

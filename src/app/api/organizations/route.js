import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getUserId(request) {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET)?.userId || null;
    } catch {
        return null;
    }
}

export async function GET(request) {
    const userId = getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: true, message: 'Authentication required.' }, { status: 401 });
    }

    try {
        const result = await db.query(
            `SELECT id, name, industry, country, state, country_name, state_name,
              currency, language, timezone, gst_registered, gst_number, address, created_at
       FROM organizations
       WHERE user_id = $1
       ORDER BY created_at ASC, id ASC`,
            [userId]
        );

        return NextResponse.json({ error: false, data: result.rows });
    } catch (error) {
        console.error('List organizations error:', error);
        return NextResponse.json({ error: true, message: 'Failed to fetch organizations.' }, { status: 500 });
    }
}

export async function POST(request) {
    const userId = getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: true, message: 'Authentication required.' }, { status: 401 });
    }

    const organization = await request.json().catch(() => null);
    if (!organization?.organizationName?.trim() || !organization.country || !organization.state) {
        return NextResponse.json(
            { error: true, message: 'Organization name, country and state are required.' },
            { status: 400 }
        );
    }

    try {
        const result = await db.query(
            `INSERT INTO organizations
        (user_id, name, industry, country, state, country_name, state_name, currency,
         language, timezone, gst_registered, gst_number, address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING id, name, industry, country, state, country_name, state_name,
                 currency, language, timezone, gst_registered, gst_number, address, created_at`,
            [
                userId,
                organization.organizationName.trim(),
                organization.industry || null,
                organization.country,
                organization.state,
                organization.countryName || null,
                organization.stateName || null,
                organization.currency || null,
                organization.language || null,
                organization.timezone || null,
                organization.gstRegistered === 'yes',
                organization.gstNumber || null,
                organization.address || null,
            ]
        );

        return NextResponse.json({ error: false, data: result.rows[0] }, { status: 201 });
    } catch (error) {
        console.error('Create organization error:', error);
        return NextResponse.json({ error: true, message: 'Failed to create organization.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const userId = getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: true, message: 'Authentication required.' }, { status: 401 });
    }

    const { organizationId } = await request.json().catch(() => ({}));
    if (!organizationId) {
        return NextResponse.json({ error: true, message: 'Organization is required.' }, { status: 400 });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const organization = await client.query(
            'SELECT id FROM organizations WHERE id = $1 AND user_id = $2 FOR UPDATE',
            [organizationId, userId]
        );

        if (organization.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: true, message: 'Organization not found.' }, { status: 404 });
        }

        await client.query('DELETE FROM invoices WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM customers WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM items WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM organizations WHERE id = $1 AND user_id = $2', [organizationId, userId]);
        await client.query('COMMIT');

        return NextResponse.json({ error: false, message: 'Organization deleted successfully.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete organization error:', error);
        return NextResponse.json({ error: true, message: 'Failed to delete organization.' }, { status: 500 });
    } finally {
        client.release();
    }
}

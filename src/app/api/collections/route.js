import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const STATUSES = new Set(['PENDING', 'CONTACTED', 'PROMISE_TO_PAY', 'COLLECTED']);

function isValidFollowupDate(value) {
    if (value === null || value === undefined || value === '') return true;
    const dateValue = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return false;
    const date = new Date(`${dateValue}T00:00:00Z`);
    return !Number.isNaN(date.getTime());
}

function normalizeFollowupDate(value) {
    return value === null || value === undefined || value === '' ? null : String(value).slice(0, 10);
}

function getAuthPayload(request) {
    try {
        const token = request.cookies.get('token')?.value;
        return token ? jwt.verify(token, JWT_SECRET) : null;
    } catch {
        return null;
    }
}

const listQuery = `
  SELECT
        i.id AS invoice_id, i.invoice_number, i.organization_id, i.customer_name,
    i.grand_total, COALESCE(i.paid_amount, 0) AS paid_amount,
    GREATEST(i.grand_total - COALESCE(i.paid_amount, 0), 0) AS balance_due,
    i.due_date,
    CASE
      WHEN COALESCE(i.paid_amount, 0) >= i.grand_total THEN 'PAID'
      WHEN COALESCE(i.paid_amount, 0) > 0 THEN 'PARTIALLY_PAID'
      WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
      ELSE 'UNPAID'
    END AS payment_status,
    i.created_at,
        c.email AS customer_email,
        COALESCE(NULLIF(regexp_replace(c.phone, '\\D', '', 'g'), ''), NULLIF(regexp_replace(i.billing_to->>'phone', '\\D', '', 'g'), ''), NULLIF(regexp_replace(i.shipping_to->>'phone', '\\D', '', 'g'), '')) AS customer_phone,
        f.id AS followup_id, f.status AS followup_status,
        f.next_followup_date, f.notes, f.contacted_at,
        f.updated_at AS followup_updated_at
        FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id AND c.organization_id = i.organization_id
    LEFT JOIN LATERAL (
        SELECT f.*
        FROM invoice_followups f
        WHERE f.invoice_id = i.id AND f.organization_id = i.organization_id
        ORDER BY f.created_at DESC, f.id DESC
        LIMIT 1
    ) f ON true
        WHERE i.organization_id = $1
    AND COALESCE(i.paid_amount, 0) < i.grand_total
    ORDER BY CASE WHEN i.due_date < CURRENT_DATE THEN 0 ELSE 1 END, i.due_date ASC NULLS LAST, f.updated_at DESC
`;

export async function GET(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const invoiceIdValue = new URL(request.url).searchParams.get('invoiceId');
        const invoiceId = Number(invoiceIdValue);
        if (invoiceIdValue && !Number.isInteger(invoiceId)) {
            return NextResponse.json({ success: false, message: 'Invalid invoice id' }, { status: 400 });
        }
        if (invoiceIdValue && Number.isInteger(invoiceId)) {
            const history = await db.query(
                `SELECT f.*
         FROM invoice_followups f
         JOIN invoices i ON i.id = f.invoice_id
         WHERE f.invoice_id = $1 AND f.organization_id = $2 AND i.organization_id = $2
         ORDER BY f.created_at DESC, f.id DESC`,
                [invoiceId, auth.organizationId],
            );
            return NextResponse.json({ success: true, data: history.rows });
        }
        const result = await db.query(listQuery, [auth.organizationId]);
        const rows = result.rows.map((row) => ({
            ...row,
            followup_status: row.followup_status || 'PENDING',
            notes: row.notes || '',
        }));
        const today = new Date().toISOString().slice(0, 10);
        return NextResponse.json({
            success: true,
            data: rows,
            summary: {
                dueToday: rows.filter((row) => row.due_date === today).length,
                overdue: rows.filter((row) => row.payment_status === 'OVERDUE').length,
                followupsPending: rows.filter((row) => row.followup_status === 'PENDING').length,
            },
        });
    } catch (error) {
        console.error('Fetch collections error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch collections' }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }
    const invoiceId = Number(body?.invoiceId);
    const status = String(body?.status || 'PENDING').toUpperCase();
    const nextFollowupDate = normalizeFollowupDate(body?.nextFollowupDate);
    const notes = String(body?.notes || '').trim();
    if (!Number.isInteger(invoiceId) || !STATUSES.has(status) || !isValidFollowupDate(nextFollowupDate)) {
        return NextResponse.json({ success: false, message: 'Invoice and valid follow-up status are required' }, { status: 400 });
    }

    try {
        const result = await db.query(
            `INSERT INTO invoice_followups (organization_id, invoice_id, customer_id, status, next_followup_date, notes, contacted_at)
       SELECT $1, i.id, i.customer_id, $3, $4, $5, CASE WHEN $3 = 'PENDING' THEN NULL ELSE NOW() END
       FROM invoices i
       WHERE i.id = $2 AND i.organization_id = $1
       RETURNING *`,
            [auth.organizationId, invoiceId, status, nextFollowupDate, notes],
        );
        if (!result.rows[0]) return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
    } catch (error) {
        console.error('Create collection follow-up error:', error);
        return NextResponse.json({ success: false, message: 'Failed to save follow-up' }, { status: 500 });
    }
}

export async function PATCH(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }
    const followupId = Number(body?.followupId);
    const status = String(body?.status || '').toUpperCase();
    const nextFollowupDate = normalizeFollowupDate(body?.nextFollowupDate);
    if (!Number.isInteger(followupId) || !STATUSES.has(status) || !isValidFollowupDate(nextFollowupDate)) {
        return NextResponse.json({ success: false, message: 'Follow-up and valid status are required' }, { status: 400 });
    }

    try {
        const result = await db.query(
            `INSERT INTO invoice_followups (organization_id, invoice_id, customer_id, status, next_followup_date, notes, contacted_at)
          SELECT f.organization_id, f.invoice_id, f.customer_id, $1::varchar(30), $2::date, $3::text,
                CASE WHEN $1::varchar(30) = 'PENDING' THEN f.contacted_at ELSE COALESCE(f.contacted_at, NOW()) END
       FROM invoice_followups f
       WHERE f.id = $4 AND f.organization_id = $5
       RETURNING *`,
            [status, nextFollowupDate, String(body?.notes || '').trim(), followupId, auth.organizationId],
        );
        if (!result.rows[0]) return NextResponse.json({ success: false, message: 'Follow-up not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Update collection follow-up error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update follow-up' }, { status: 500 });
    }
}

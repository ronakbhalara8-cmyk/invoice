import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function getAuthPayload(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return null;
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function normalizeItems(items) {
    return items.map((item) => {
        const qty = Number(item.qty || 0);
        const rate = Number(item.rate || 0);
        const discount = Math.min(Math.max(Number(item.discount || 0), 0), 100);
        const amount = qty * rate * (1 - discount / 100);
        return {
            item_id: item.item_id || null,
            name: String(item.name || '').trim(),
            qty,
            rate,
            discount,
            amount,
        };
    });
}

function calculateTotals(items, gstRate) {
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const discountAmount = items.reduce((sum, item) => sum + (item.qty * item.rate * item.discount) / 100, 0);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * Number(gstRate || 0)) / 100;
    return {
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal: taxableAmount + taxAmount,
    };
}

function normalizePayload(body) {
    const items = Array.isArray(body?.items) ? normalizeItems(body.items) : [];
    const customerInfo = body?.customerInfo || {};
    const companyInfo = { ...(body?.companyInfo || {}), currency: body?.currency || body?.companyInfo?.currency || 'INR' };
    const customerName = String(body?.customerName || customerInfo.customer_name || '').trim();
    const gstRate = Number(body?.gstRate || 0);
    return {
        customerId: body?.customerId || null,
        customerName,
        customerInfo,
        companyInfo,
        items,
        gstRate,
        terms: String(body?.terms || '').trim(),
        totals: calculateTotals(items, gstRate),
    };
}

function serializeQuotation(row) {
    return {
        ...row,
        currency: row.company_info?.currency || 'INR',
        customer_info: row.customer_info || {},
        company_info: row.company_info || {},
        items: Array.isArray(row.items) ? row.items : [],
    };
}

async function nextQuotationNumber(client, organizationId) {
    const result = await client.query(
        `SELECT quotation_number FROM quotations WHERE organization_id = $1 ORDER BY quotation_number`,
        [organizationId],
    );
    const usedNumbers = new Set(
        result.rows
            .map((row) => row.quotation_number)
            .filter((value) => value?.startsWith('QUO-'))
            .map((value) => Number(value.replace('QUO-', '')))
            .filter((value) => Number.isInteger(value)),
    );
    let candidate = 1;
    while (usedNumbers.has(candidate)) candidate += 1;
    return `QUO-${String(candidate).padStart(8, '0')}`;
}

export async function GET(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const result = await db.query(
            `SELECT * FROM quotations WHERE organization_id = $1 ORDER BY created_at DESC`,
            [auth.organizationId],
        );
        return NextResponse.json({ success: true, data: result.rows.map(serializeQuotation) });
    } catch (error) {
        console.error('Fetch quotations error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch quotations' }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const payload = normalizePayload(await request.json());
        if (!payload.customerName || !payload.items.length || payload.items.some((item) => !item.name || item.qty <= 0 || item.rate <= 0)) {
            return NextResponse.json({ success: false, message: 'Customer and valid quotation items are required' }, { status: 400 });
        }

        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const quotationNumber = await nextQuotationNumber(client, auth.organizationId);
            const result = await client.query(
                `INSERT INTO quotations (
          organization_id, quotation_number, customer_id, customer_name, customer_info,
          company_info, items, subtotal, discount_amount, gst_rate, tax_amount, grand_total, terms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
                [
                    auth.organizationId,
                    quotationNumber,
                    payload.customerId,
                    payload.customerName,
                    JSON.stringify(payload.customerInfo),
                    JSON.stringify(payload.companyInfo),
                    JSON.stringify(payload.items),
                    payload.totals.subtotal,
                    payload.totals.discountAmount,
                    payload.gstRate,
                    payload.totals.taxAmount,
                    payload.totals.grandTotal,
                    payload.terms,
                ],
            );
            await client.query('COMMIT');
            return NextResponse.json({ success: true, data: serializeQuotation(result.rows[0]) }, { status: 201 });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Create quotation error:', error);
        return NextResponse.json({ success: false, message: 'Failed to create quotation' }, { status: 500 });
    }
}

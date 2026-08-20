import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../../lib/db';

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
        return {
            item_id: item.item_id || null,
            name: String(item.name || '').trim(),
            qty,
            rate,
            discount,
            amount: qty * rate * (1 - discount / 100),
        };
    });
}

function normalizePayload(body) {
    const items = Array.isArray(body?.items) ? normalizeItems(body.items) : [];
    const customerInfo = body?.customerInfo || {};
    const companyInfo = { ...(body?.companyInfo || {}), currency: body?.currency || body?.companyInfo?.currency || 'INR' };
    const customerName = String(body?.customerName || customerInfo.customer_name || '').trim();
    const gstRate = Number(body?.gstRate || 0);
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const discountAmount = items.reduce((sum, item) => sum + (item.qty * item.rate * item.discount) / 100, 0);
    const taxAmount = ((subtotal - discountAmount) * gstRate) / 100;
    return {
        customerId: body?.customerId || null,
        customerName,
        customerInfo,
        companyInfo,
        items,
        gstRate,
        terms: String(body?.terms || '').trim(),
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal: subtotal - discountAmount + taxAmount,
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

export async function PUT(request, { params }) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const payload = normalizePayload(await request.json());
        if (!payload.customerName || !payload.items.length || payload.items.some((item) => !item.name || item.qty <= 0 || item.rate <= 0)) {
            return NextResponse.json({ success: false, message: 'Customer and valid quotation items are required' }, { status: 400 });
        }
        const result = await db.query(
            `UPDATE quotations SET customer_id = $1, customer_name = $2, customer_info = $3,
        company_info = $4, items = $5, subtotal = $6, discount_amount = $7,
        gst_rate = $8, tax_amount = $9, grand_total = $10, terms = $11, updated_at = NOW()
       WHERE id = $12 AND organization_id = $13 RETURNING *`,
            [
                payload.customerId,
                payload.customerName,
                JSON.stringify(payload.customerInfo),
                JSON.stringify(payload.companyInfo),
                JSON.stringify(payload.items),
                payload.subtotal,
                payload.discountAmount,
                payload.gstRate,
                payload.taxAmount,
                payload.grandTotal,
                payload.terms,
                id,
                auth.organizationId,
            ],
        );
        if (!result.rows[0]) return NextResponse.json({ success: false, message: 'Quotation not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: serializeQuotation(result.rows[0]) });
    } catch (error) {
        console.error('Update quotation error:', error);
        return NextResponse.json({ success: false, message: 'Failed to update quotation' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const result = await db.query(
            `DELETE FROM quotations WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, auth.organizationId],
        );
        if (!result.rows[0]) return NextResponse.json({ success: false, message: 'Quotation not found' }, { status: 404 });
        return NextResponse.json({ success: true, message: 'Quotation deleted' });
    } catch (error) {
        console.error('Delete quotation error:', error);
        return NextResponse.json({ success: false, message: 'Failed to delete quotation' }, { status: 500 });
    }
}

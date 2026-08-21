import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'OTHER']);

function isValidPaymentDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Date();
    const todayValue = today.toISOString().slice(0, 10);
    return !Number.isNaN(date.getTime()) && value <= todayValue;
}

function getAuthPayload(request) {
    try {
        const token = request.cookies.get('token')?.value;
        return token ? jwt.verify(token, JWT_SECRET) : null;
    } catch {
        return null;
    }
}

function generatePaymentNumber(existingNumbers = []) {
    const usedNumbers = new Set(existingNumbers.map((number) => Number(String(number).replace('PAY-', ''))).filter(Number.isInteger));
    let candidate = 1;
    while (usedNumbers.has(candidate)) candidate += 1;
    return `PAY-${String(candidate).padStart(8, '0')}`;
}

export async function GET(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const view = searchParams.get('view');

    try {
        if (view === 'receivables') {
            const result = await db.query(
                `SELECT * FROM invoice_receivables
         WHERE organization_id = $1 AND payment_status <> 'VOID'
         ORDER BY due_date ASC, created_at DESC`,
                [auth.organizationId],
            );
            return NextResponse.json({ success: true, data: result.rows });
        }

        const values = [auth.organizationId];
        let query = `SELECT * FROM payments WHERE organization_id = $1`;
        if (invoiceId) {
            values.push(invoiceId);
            query += ' AND invoice_id = $2';
        }
        query += ' ORDER BY payment_date DESC, id DESC';
        const result = await db.query(query, values);
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Fetch payments error:', error);
        return NextResponse.json({ success: false, message: 'Failed to fetch payments' }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = getAuthPayload(request);
    if (!auth?.organizationId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const invoiceId = Number(body?.invoiceId);
    const amount = Number(body?.amount);
    const paymentMethod = String(body?.paymentMethod || 'OTHER').toUpperCase();
    const paymentDate = body?.paymentDate || new Date().toISOString().slice(0, 10);

    if (!Number.isInteger(invoiceId) || !Number.isFinite(amount) || amount <= 0 || !PAYMENT_METHODS.has(paymentMethod) || !isValidPaymentDate(paymentDate)) {
        return NextResponse.json({ success: false, message: 'Invoice, valid amount, supported payment method, and a date up to today are required' }, { status: 400 });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const invoiceResult = await client.query(
            `SELECT id, customer_id, customer_name, grand_total, paid_amount, payment_status
       FROM invoices WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
            [invoiceId, auth.organizationId],
        );
        const invoice = invoiceResult.rows[0];
        if (!invoice) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
        }
        if (invoice.payment_status === 'VOID') {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, message: 'Cannot pay a void invoice' }, { status: 400 });
        }

        const balance = Number(invoice.grand_total) - Number(invoice.paid_amount || 0);
        if (amount > balance) {
            await client.query('ROLLBACK');
            return NextResponse.json({ success: false, message: `Payment cannot exceed remaining balance of ${balance.toFixed(2)}` }, { status: 400 });
        }

        const numberResult = await client.query(
            `SELECT payment_number FROM payments WHERE organization_id = $1 ORDER BY id`,
            [auth.organizationId],
        );
        const paymentNumber = generatePaymentNumber(numberResult.rows.map((row) => row.payment_number));
        const paymentResult = await client.query(
            `INSERT INTO payments (
        organization_id, invoice_id, customer_id, payment_number, customer_name,
        amount, payment_date, payment_method, reference_number, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
            [
                auth.organizationId,
                invoice.id,
                invoice.customer_id || null,
                paymentNumber,
                invoice.customer_name,
                amount,
                paymentDate,
                paymentMethod,
                String(body?.referenceNumber || '').trim(),
                String(body?.notes || '').trim(),
            ],
        );
        await client.query('COMMIT');
        return NextResponse.json({ success: true, data: paymentResult.rows[0] }, { status: 201 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create payment error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Failed to record payment' }, { status: 500 });
    } finally {
        client.release();
    }
}

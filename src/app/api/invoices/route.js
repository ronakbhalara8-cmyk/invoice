import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function generateInvoiceNumberForDate(existingNumbers = []) {
  // Extract numeric parts from existing INV-XXXXXXXX numbers
  const usedNumbers = new Set(
    existingNumbers
      .filter(num => num && num.startsWith('INV-'))
      .map(num => parseInt(num.replace('INV-', ''), 10))
      .filter(num => !isNaN(num) && num >= 10000000 && num <= 99999999)
  );

  // Maximum attempts to find unique number (to prevent infinite loop)
  const MAX_ATTEMPTS = 10000;
  let attempts = 0;
  let candidate;

  do {
    // Generate random 8-digit number between 10000000 and 99999999
    candidate = Math.floor(10000000 + Math.random() * 90000000);
    attempts++;

    // If we've tried too many times and still no unique number
    if (attempts > MAX_ATTEMPTS) {
      throw new Error('Unable to generate unique invoice number after ' + MAX_ATTEMPTS + ' attempts');
    }
  } while (usedNumbers.has(candidate));

  return `INV-${String(candidate).padStart(8, '0')}`;
}

function getAuthPayload(request) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function GET(request) {
  try {
    const auth = getAuthPayload(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.connect();

    try {
      const query = `
        SELECT
          id,
          invoice_number,
          customer_name,
          company_info,
          billing_to,
          shipping_to,
          items,
          subtotal,
          gst_rate,
          grand_total,
          terms,
          created_at
        FROM invoices
        WHERE organization_id = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [auth.organizationId]);

      return NextResponse.json({
        success: true,
        data: result.rows.map((invoice) => ({
          ...invoice,
          company_info: invoice.company_info || {},
          billing_to: invoice.billing_to || {},
          shipping_to: invoice.shipping_to || {},
          items: Array.isArray(invoice.items) ? invoice.items : [],
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch invoices error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = getAuthPayload(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      invoiceNumber,
      companyInfo,
      billingTo,
      shippingTo,
      items,
      gstRate,
      subtotal,
      grandTotal,
      terms,
    } = body || {};

    if (!companyInfo || !billingTo || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid invoice payload' }, { status: 400 });
    }

    const customerName = shippingTo?.customer_name || billingTo.customer_name || 'Customer';
    const normalizedItems = items.map((item) => ({
      name: item.name,
      qty: Number(item.qty || 0),
      rate: Number(item.rate || 0),
      amount: Number(item.amount || (Number(item.qty || 0) * Number(item.rate || 0))),
    }));

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const existingNumbers = await client.query(
        `SELECT invoice_number FROM invoices ORDER BY invoice_number`
      );
      const generatedNumber = generateInvoiceNumberForDate(existingNumbers.rows.map((row) => row.invoice_number));

      const insertQuery = `
        INSERT INTO invoices (
          organization_id,
          invoice_number,
          customer_name,
          company_info,
          billing_to,
          shipping_to,
          items,
          subtotal,
          gst_rate,
          grand_total,
          terms,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING id
      `;

      const insertValues = [
        auth.organizationId,
        generatedNumber,
        customerName,
        JSON.stringify(companyInfo || {}),
        JSON.stringify(billingTo || {}),
        JSON.stringify(shippingTo || {}),
        JSON.stringify(normalizedItems),
        Number(subtotal || 0),
        Number(gstRate || 0),
        Number(grandTotal || 0),
        terms || '',
      ];

      const result = await client.query(insertQuery, insertValues);
      const invoiceId = result.rows[0]?.id;

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          id: invoiceId,
          invoice_number: generatedNumber,
          customer_name: customerName,
          company_info: companyInfo,
          billing_to: billingTo,
          shipping_to: shippingTo,
          items: normalizedItems,
          subtotal: Number(subtotal || 0),
          gst_rate: Number(gstRate || 0),
          grand_total: Number(grandTotal || 0),
          terms: terms || '',
          created_at: new Date().toISOString(),
        },
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create invoice' }, { status: 500 });
  }
}

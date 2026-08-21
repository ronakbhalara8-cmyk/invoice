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
      .filter(num => !isNaN(num) && num >= 0 && num <= 99999999)
  );

  // Start from 1 and find the next available number
  let candidate = 1;

  // Find the smallest unused number
  while (usedNumbers.has(candidate)) {
    candidate++;

    // Safety check to prevent infinite loop
    if (candidate > 99999999) {
      throw new Error('Maximum invoice number limit reached (99999999)');
    }
  }

  // Pad with leading zeros to make it 8 digits
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
          customer_id,
          invoice_number,
          customer_name,
          company_info,
          billing_to,
          shipping_to,
          items,
          subtotal,
          gst_rate,
          grand_total,
          paid_amount,
          payment_status,
          due_date,
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
          currency: invoice.company_info?.currency || 'INR',
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
      currency,
      customer_id,
      customer_first_name,
      customer_last_name,
      invoiceNumber,
      companyInfo,
      billingTo,
      shippingTo,
      items,
      gstRate,
      subtotal,
      discountAmount,
      gstAmount,
      grandTotal,
      terms,
    } = body || {};

    if (!companyInfo || !billingTo || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid invoice payload' }, { status: 400 });
    }

    // Merge customer's first_name and last_name for database storage
    const customerName = [customer_first_name, customer_last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || billingTo.customer_name || shippingTo?.customer_name || 'Customer';
    const normalizedItems = items.map((item) => ({
      item_id: item.item_id || null,
      name: item.name,
      qty: Number(item.qty || 0),
      rate: Number(item.rate || 0),
      discount: Number(item.discount || 0),
      amount: Number(item.amount || (Number(item.qty || 0) * Number(item.rate || 0) * (1 - Number(item.discount || 0) / 100))),
    }));

    const invoiceSubtotal = Number(subtotal || 0);
    const invoiceDiscountAmount = Number(discountAmount || normalizedItems.reduce((sum, item) => sum + ((Number(item.qty || 0) * Number(item.rate || 0)) * (Number(item.discount || 0) / 100)), 0));
    const invoiceTaxAmount = Number(gstAmount || (invoiceSubtotal * Number(gstRate || 0) / 100));
    const invoiceGrandTotal = Number(grandTotal || (invoiceSubtotal + invoiceTaxAmount));

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
          customer_id,
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING id
      `;

      const companyInfoWithCurrency = {
        ...companyInfo,
        currency: currency || 'INR',
      };

      const insertValues = [
        auth.organizationId,
        customer_id || null,
        generatedNumber,
        customerName,
        JSON.stringify(companyInfoWithCurrency || {}),
        JSON.stringify(billingTo || {}),
        JSON.stringify(shippingTo || {}),
        JSON.stringify(normalizedItems),
        invoiceSubtotal,
        Number(gstRate || 0),
        invoiceGrandTotal,
        terms || '',
      ];

      const result = await client.query(insertQuery, insertValues);
      const invoiceId = result.rows[0]?.id;

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          id: invoiceId,
          customer_id: customer_id || null,
          invoice_number: generatedNumber,
          customer_name: customerName,
          currency: currency || 'INR',
          company_info: companyInfoWithCurrency,
          billing_to: billingTo,
          shipping_to: shippingTo,
          items: normalizedItems,
          subtotal: invoiceSubtotal,
          discount_amount: invoiceDiscountAmount,
          tax_amount: invoiceTaxAmount,
          gst_rate: Number(gstRate || 0),
          grand_total: invoiceGrandTotal,
          paid_amount: 0,
          payment_status: 'UNPAID',
          due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
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

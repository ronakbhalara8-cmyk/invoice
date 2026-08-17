import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
        SELECT *
        FROM customers
        WHERE organization_id = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [auth.organizationId]);

      return NextResponse.json({
        success: true,
        data: result.rows.map((customer) => ({
          ...customer,
          billing_address: customer.billing_address || {},
          shipping_address: customer.shipping_address || {},
          contact_persons: Array.isArray(customer.contact_persons) ? customer.contact_persons : [],
        })),
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch customers' }, { status: 500 });
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
      customer_type,
      first_name,
      last_name,
      company_name,
      email,
      phone,
      pan,
      payment_terms,
      billing_address,
      shipping_address,
      contact_persons,
      remarks,
    } = body || {};

    if (!first_name && !last_name && !company_name) {
      return NextResponse.json({ success: false, message: 'Customer name is required' }, { status: 400 });
    }

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO customers (
          organization_id,
          customer_type,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          pan,
          payment_terms,
          billing_address,
          shipping_address,
          contact_persons,
          remarks,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        auth.organizationId,
        customer_type || 'Individual',
        first_name || '',
        last_name || '',
        company_name || '',
        email || '',
        phone || '',
        pan || '',
        payment_terms || '',
        JSON.stringify(billing_address || {}),
        JSON.stringify(shipping_address || {}),
        JSON.stringify(Array.isArray(contact_persons) ? contact_persons : []),
        remarks || '',
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const createdCustomer = result.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          ...createdCustomer,
          billing_address: createdCustomer.billing_address || {},
          shipping_address: createdCustomer.shipping_address || {},
          contact_persons: Array.isArray(createdCustomer.contact_persons) ? createdCustomer.contact_persons : [],
        },
      }, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ success: false, message: 'Failed to create customer' }, { status: 500 });
  }
}

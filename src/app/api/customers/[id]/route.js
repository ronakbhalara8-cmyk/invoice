import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '../../../../lib/db';

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

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const auth = getAuthPayload(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.connect();
    try {
      const query = `
        SELECT *
        FROM customers
        WHERE id = $1 AND organization_id = $2
      `;
      const result = await client.query(query, [id, auth.organizationId]);

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
      }

      const customer = result.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          ...customer,
          billing_address: customer.billing_address || {},
          shipping_address: customer.shipping_address || {},
          contact_persons: Array.isArray(customer.contact_persons) ? customer.contact_persons : [],
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        UPDATE customers
        SET
          customer_type = $1,
          first_name = $2,
          last_name = $3,
          company_name = $4,
          email = $5,
          phone = $6,
          pan = $7,
          payment_terms = $8,
          billing_address = $9,
          shipping_address = $10,
          contact_persons = $11,
          remarks = $12,
          updated_at = NOW()
        WHERE id = $13 AND organization_id = $14
        RETURNING *
      `;

      const values = [
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
        id,
        auth.organizationId,
      ];

      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
      }

      await client.query('COMMIT');

      const updatedCustomer = result.rows[0];
      return NextResponse.json({
        success: true,
        data: {
          ...updatedCustomer,
          billing_address: updatedCustomer.billing_address || {},
          shipping_address: updatedCustomer.shipping_address || {},
          contact_persons: Array.isArray(updatedCustomer.contact_persons) ? updatedCustomer.contact_persons : [],
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const auth = getAuthPayload(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const client = await db.connect();
    try {
      const query = `
        DELETE FROM customers
        WHERE id = $1 AND organization_id = $2
      `;

      const result = await client.query(query, [id, auth.organizationId]);

      if (result.rowCount === 0) {
        return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete customer' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper function to get organization from token
async function getOrganizationFromToken(request) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) {
            return null;
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
            userId: decoded.userId,
            organizationId: decoded.organizationId
        };
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// GET - Fetch all items for the authenticated organization
export async function GET(request) {
    try {
        const auth = await getOrganizationFromToken(request);
        if (!auth) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const sortOrder = searchParams.get('sortOrder') || 'DESC';

        const client = await db.connect();

        try {
            // Build query conditions - only filter by organization_id
            let conditions = 'organization_id = $1';
            let values = [auth.organizationId];
            let paramIndex = 2;

            if (search) {
                conditions += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
                values.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                conditions += ` AND status = $${paramIndex}`;
                values.push(status);
                paramIndex++;
            }

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM items 
                WHERE ${conditions}
            `;
            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);

            // Get paginated data
            const dataQuery = `
                SELECT 
                    id,
                    name,
                    description,
                    price,
                    status,
                    image,
                    created_at,
                    updated_at
                FROM items 
                WHERE ${conditions}
                ORDER BY ${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            values.push(limit, offset);

            const result = await client.query(dataQuery, values);

            return NextResponse.json({
                success: true,
                data: result.rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error fetching items:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}

// POST - Create new item
export async function POST(request) {
    try {
        const auth = await getOrganizationFromToken(request);
        if (!auth) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const name = formData.get('name');
        const description = formData.get('description') || '';
        const price = parseFloat(formData.get('price'));
        const status = formData.get('status') || 'Active';
        const image = formData.get('image');

        // Validation
        if (!name || !price) {
            return NextResponse.json(
                { success: false, message: 'Name and price are required' },
                { status: 400 }
            );
        }

        if (price < 0) {
            return NextResponse.json(
                { success: false, message: 'Price must be greater than 0' },
                { status: 400 }
            );
        }

        let imagePath = null;
        if (image && image.size > 0) {
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
            if (!allowedTypes.includes(image.type)) {
                return NextResponse.json(
                    { success: false, message: 'Invalid file type. Allowed: JPEG, PNG, WEBP' },
                    { status: 400 }
                );
            }

            // Validate file size (max 5MB)
            if (image.size > 5 * 1024 * 1024) {
                return NextResponse.json(
                    { success: false, message: 'File size must be less than 5MB' },
                    { status: 400 }
                );
            }

            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'items');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const timestamp = Date.now();
            const ext = path.extname(image.name);
            const filename = `${timestamp}${ext}`;
            const filePath = path.join(uploadDir, filename);

            const buffer = Buffer.from(await image.arrayBuffer());
            fs.writeFileSync(filePath, buffer);
            imagePath = `/uploads/items/${filename}`;
        }

        const client = await db.connect();

        try {
            const query = `
                INSERT INTO items (
                    organization_id,
                    name,
                    description,
                    price,
                    status,
                    image,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING 
                    id,
                    name,
                    description,
                    price,
                    status,
                    image,
                    created_at,
                    updated_at
            `;

            const values = [
                auth.organizationId,  // Only organization_id, no user_id
                name.trim(),
                description.trim(),
                price,
                status,
                imagePath
            ];

            const result = await client.query(query, values);

            return NextResponse.json({
                success: true,
                data: result.rows[0],
                message: 'Item created successfully'
            }, { status: 201 });

        } catch (error) {
            console.error('Database error:', error);
            return NextResponse.json(
                { success: false, message: 'Failed to create item' },
                { status: 500 }
            );
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error creating item:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create item' },
            { status: 500 }
        );
    }
}
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
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

// Helper function to get upload directory (Local + Vercel compatible)
function getUploadDir() {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? '/tmp' : path.join(process.cwd(), 'public');
    const uploadDir = path.join(baseDir, 'uploads', 'items');
    
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    return uploadDir;
}

// Helper function to delete image file
function deleteImageFile(imagePath) {
    if (!imagePath) return;
    
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        let fullPath;
        
        if (isProduction) {
            // In Vercel, images are in /tmp
            const filename = path.basename(imagePath);
            fullPath = path.join('/tmp', 'uploads', 'items', filename);
        } else {
            // In local development
            fullPath = path.join(process.cwd(), 'public', imagePath);
        }
        
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Deleted image: ${fullPath}`);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}

// Helper function to check if item exists and belongs to organization
async function getItemByIdAndOrganization(itemId, organizationId) {
    const client = await db.connect();
    try {
        const query = `
            SELECT * FROM items 
            WHERE id = $1 AND organization_id = $2
        `;
        const result = await client.query(query, [itemId, organizationId]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

// Helper function to save image
async function saveImage(image, existingImagePath = null) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(image.type)) {
        throw new Error('Invalid file type. Allowed: JPEG, PNG, WEBP');
    }

    // Validate file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
    }

    // Delete old image if exists
    if (existingImagePath) {
        deleteImageFile(existingImagePath);
    }

    // Save new image
    const uploadDir = getUploadDir();
    const timestamp = Date.now();
    const ext = path.extname(image.name);
    const filename = `${timestamp}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await image.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Return relative path for database
    return `/uploads/items/${filename}`;
}

// GET - Fetch single item
export async function GET(request, { params }) {
    try {
        // ✅ FIX: Await params (Next.js 15 requirement)
        const { id } = await params;
        
        const auth = await getOrganizationFromToken(request);
        if (!auth) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const item = await getItemByIdAndOrganization(id, auth.organizationId);

        if (!item) {
            return NextResponse.json(
                { success: false, message: 'Item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('Error fetching item:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to fetch item' },
            { status: 500 }
        );
    }
}

// PUT - Update item
export async function PUT(request, { params }) {
    try {
        // ✅ FIX: Await params (Next.js 15 requirement)
        const { id } = await params;
        
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
        const existingImage = formData.get('existingImage');

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

        // Check if item exists and belongs to organization
        const existingItem = await getItemByIdAndOrganization(id, auth.organizationId);
        if (!existingItem) {
            return NextResponse.json(
                { success: false, message: 'Item not found' },
                { status: 404 }
            );
        }

        let imagePath = existingImage || existingItem.image;

        // Handle image upload
        if (image && image.size > 0) {
            try {
                imagePath = await saveImage(image, existingItem.image);
            } catch (uploadError) {
                return NextResponse.json(
                    { success: false, message: uploadError.message },
                    { status: 400 }
                );
            }
        }

        const client = await db.connect();

        try {
            const query = `
                UPDATE items 
                SET 
                    name = $1,
                    description = $2,
                    price = $3,
                    status = $4,
                    image = $5,
                    updated_at = NOW()
                WHERE id = $6 AND organization_id = $7
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
                name.trim(),
                description.trim(),
                price,
                status,
                imagePath,
                id,
                auth.organizationId
            ];

            const result = await client.query(query, values);

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, message: 'Item not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: result.rows[0],
                message: 'Item updated successfully'
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error updating item:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update item' },
            { status: 500 }
        );
    }
}

// DELETE - Delete item
export async function DELETE(request, { params }) {
    try {
        // ✅ FIX: Await params (Next.js 15 requirement)
        const { id } = await params;
        
        const auth = await getOrganizationFromToken(request);
        if (!auth) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if item exists and get image path
        const existingItem = await getItemByIdAndOrganization(id, auth.organizationId);
        if (!existingItem) {
            return NextResponse.json(
                { success: false, message: 'Item not found' },
                { status: 404 }
            );
        }

        const client = await db.connect();

        try {
            // Delete item
            const query = `
                DELETE FROM items 
                WHERE id = $1 AND organization_id = $2
                RETURNING id
            `;
            const result = await client.query(query, [id, auth.organizationId]);

            if (result.rows.length === 0) {
                return NextResponse.json(
                    { success: false, message: 'Item not found' },
                    { status: 404 }
                );
            }

            // Delete image file if exists
            if (existingItem.image) {
                deleteImageFile(existingItem.image);
            }

            return NextResponse.json({
                success: true,
                message: 'Item deleted successfully'
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error deleting item:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete item' },
            { status: 500 }
        );
    }
}
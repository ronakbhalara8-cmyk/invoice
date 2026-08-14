import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
    try {
        const { filename } = params;
        
        // Check if in production (Vercel)
        const isProduction = process.env.NODE_ENV === 'production';
        const filePath = isProduction 
            ? path.join('/tmp', 'uploads', 'items', filename)
            : path.join(process.cwd(), 'public', 'uploads', 'items', filename);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Read file
        const fileBuffer = fs.readFileSync(filePath);
        
        // Determine content type
        const ext = path.extname(filename).toLowerCase();
        const contentType = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
        }[ext] || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving image:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
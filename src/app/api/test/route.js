// app/api/test/route.js
import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function GET() {
    let client;
    try {
        client = await db.connect();

        const result = await client.query(`
      SELECT 
        NOW() as current_time,
        version() as postgres_version,
        current_database() as database_name,
        current_user as user_name
    `);

        const isLocal = process.env.IS_LOCAL === 'true';
        const isSupabase = process.env.IS_SUPABASE === 'true';
        const dbType = isLocal ? 'LOCAL' : isSupabase ? 'SUPABASE' : 'UNKNOWN';

        return NextResponse.json({
            success: true,
            message: `✅ Successfully connected to ${dbType} Database!`,
            data: {
                connection: {
                    type: dbType,
                    host: isLocal ? process.env.LOCAL_DB_HOST : process.env.SUPABASE_DB_HOST,
                    port: isLocal ? process.env.LOCAL_DB_PORT : process.env.SUPABASE_DB_PORT,
                    database: isLocal ? process.env.LOCAL_DB_NAME : process.env.SUPABASE_DB_NAME,
                    user: isLocal ? process.env.LOCAL_DB_USER : process.env.SUPABASE_DB_USER,
                },
                server: {
                    currentTime: result.rows[0].current_time,
                    postgresVersion: result.rows[0].postgres_version,
                    databaseName: result.rows[0].database_name,
                    userName: result.rows[0].user_name,
                },
                flags: {
                    isLocal: isLocal,
                    isSupabase: isSupabase,
                }
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: 'Database connection failed',
            error: error.message,
            details: {
                isLocal: process.env.IS_LOCAL === 'true',
                isSupabase: process.env.IS_SUPABASE === 'true',
            }
        }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
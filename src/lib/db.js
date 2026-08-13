// lib/db.js
import { Pool } from 'pg';

// Helper function to get database configuration
function getDatabaseConfig() {
  const isLocal = process.env.IS_LOCAL === 'true';
  const isSupabase = process.env.IS_SUPABASE === 'true';

  if (isLocal) {
    // Local PostgreSQL Configuration
    return {
      host: process.env.LOCAL_DB_HOST,
      port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
      database: process.env.LOCAL_DB_NAME,
      user: process.env.LOCAL_DB_USER,
      password: process.env.LOCAL_DB_PASSWORD,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  } else if (isSupabase) {
    // Supabase Configuration (Transaction Pooler)
    return {
      connectionString: process.env.SUPABASE_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
        require: true
      },
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    };
  } else {
    // Default to local if no flag is set
    return {
      host: process.env.LOCAL_DB_HOST || 'localhost',
      port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
      database: process.env.LOCAL_DB_NAME || 'invoice',
      user: process.env.LOCAL_DB_USER || 'postgres',
      password: process.env.LOCAL_DB_PASSWORD || '123456',
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }
}

// Create pool with dynamic configuration
const config = getDatabaseConfig();
const pool = new Pool(config);

// Error handler
pool.on('error', (err) => {
  console.error('Database connection error:', err.message);
});

// Export default pool only
export default pool;
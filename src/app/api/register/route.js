import bcrypt from 'bcrypt';
import db from '../../../lib/db';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            companyName,
            phone,
            email,
            password,
            country,
            countryCode,
            state,
        } = body;

        if (
            !companyName?.trim() ||
            !phone?.trim() ||
            !email?.trim() ||
            !password ||
            !country?.trim() ||
            !countryCode?.trim() ||
            (country === 'India' && !state?.trim())
        ) {
            return new Response(
                JSON.stringify({
                    error: true,
                    message: 'All required fields must be provided.',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const query = `
      INSERT INTO users (
        company_name,
        phone,
        email,
        password_hash,
        country,
        country_code,
        state,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id;
    `;

        const values = [
            companyName.trim(),
            phone.trim(),
            email.trim(),
            passwordHash,
            country.trim(),
            countryCode.trim(),
            country === 'India' ? state.trim() : null,
        ];

        try {
            const result = await db.query(query, values);

            return new Response(
                JSON.stringify({
                    error: false,
                    data: { id: result.rows[0]?.id },
                    message: 'Registration completed successfully.',
                }),
                {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        } catch (dbError) {
            if (dbError.code === '23505' && dbError.constraint?.includes('email')) {
                return new Response(
                    JSON.stringify({
                        error: true,
                        message: 'Email already exists. Please use another email.',
                    }),
                    {
                        status: 409,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }

            throw dbError;
        }
    } catch (error) {
        console.error('Registration API Error:', error);

        return new Response(
            JSON.stringify({
                error: true,
                message: 'Unable to complete registration at this time.',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

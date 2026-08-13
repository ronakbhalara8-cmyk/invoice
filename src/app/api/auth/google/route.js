import bcrypt from 'bcrypt';
import db from '../../../../lib/db';

function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString('utf8')
                .split('')
                .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Google token decode error:', error);
        return null;
    }
}

function getErrorMessage(error) {
    if (error?.code === '23505' && error?.constraint?.includes('email')) {
        return 'Email already exists. Please use another email.';
    }

    return 'Unable to complete Google registration at this time.';
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            idToken,
            companyName,
            phone,
            country,
            countryCode,
            state,
        } = body;

        const payload = idToken ? decodeJwtPayload(idToken) : null;
        const email = payload?.email || body.email?.trim();
        const safeCompanyName = companyName?.trim();

        if (!email?.trim() || !phone?.trim() || !country?.trim() || !countryCode?.trim()) {
            return new Response(
                JSON.stringify({
                    error: true,
                    message: 'Email, phone, country, and country code are required.',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        const passwordHash = await bcrypt.hash(`${email.trim()}:${Date.now()}:${Math.random()}`, 12);

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
            safeCompanyName,
            phone.trim(),
            email.trim(),
            passwordHash,
            country.trim(),
            countryCode.trim(),
            country === 'India' ? state?.trim() || null : null,
        ];

        try {
            const result = await db.query(query, values);

            return new Response(
                JSON.stringify({
                    error: false,
                    data: { id: result.rows[0]?.id },
                    message: 'Google registration completed successfully.',
                }),
                {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        } catch (dbError) {
            console.error('Google registration DB error:', dbError);

            return new Response(
                JSON.stringify({
                    error: true,
                    message: getErrorMessage(dbError),
                }),
                {
                    status: dbError?.code === '23505' ? 409 : 500,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }
    } catch (error) {
        console.error('Google registration API Error:', error);

        return new Response(
            JSON.stringify({
                error: true,
                message: 'Unable to complete Google registration at this time.',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

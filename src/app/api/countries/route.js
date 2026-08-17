export async function GET() {
  try {
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/codes', {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Countries API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result?.data || !Array.isArray(result.data)) {
      throw new Error('Invalid country payload');
    }

    const countriesData = result.data.map((country, index) => ({
      id: index,
      iso2: country.iso2 || country.Iso2 || country.code || '',
      iso3: country.iso3 || country.Iso3 || '',
      name: country.name || country.country || '',
      dialCode: country.dial_code || country.dialCode || '',
    }));

    return Response.json(countriesData, { status: 200 });
  } catch (error) {
    console.error('Countries API route error:', error);
    return Response.json(
      { error: true, message: 'Failed to load countries.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = (searchParams.get('country') || '').trim();

    if (!countryCode) {
      return Response.json([], { status: 200 });
    }

    // Fetch all countries and states from the API
    const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`States API error: ${response.status}`);
    }

    const result = await response.json();

    if (!result?.data || !Array.isArray(result.data)) {
      throw new Error('Invalid state payload');
    }

    // Find country by ISO2 code (like 'IN') or by name
    let countryEntry = result.data.find(
      (entry) => (entry?.iso2 || '').toLowerCase() === countryCode.toLowerCase()
    );

    // If not found by ISO2, try by name
    if (!countryEntry) {
      countryEntry = result.data.find(
        (entry) => (entry?.name || '').toLowerCase() === countryCode.toLowerCase()
      );
    }

    if (!countryEntry) {
      return Response.json([], { status: 200 });
    }

    const statesData = (countryEntry?.states || []).map((state) => ({
      id: state.state_code || state.name,
      state_code: state.state_code || state.name.substring(0, 2).toUpperCase(),
      name: state.name || state.state || '',
    }));

    return Response.json(statesData, { status: 200 });
  } catch (error) {
    console.error('States API route error:', error);
    return Response.json(
      { error: true, message: 'Failed to load states.' },
      { status: 500 }
    );
  }
}
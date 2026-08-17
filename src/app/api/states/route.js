export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = (searchParams.get('country') || '').trim();

    if (!country) {
      return Response.json([], { status: 200 });
    }

    const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
      headers: {
        Accept: 'application/json',
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

    const countryEntry = result.data.find(
      (entry) => (entry?.name || '').toLowerCase() === country.toLowerCase()
    );

    const statesData = (countryEntry?.states || []).map((state) => ({
      id: state.id || state.state_code || state.name,
      state_code: state.state_code || state.stateCode || state.code || '',
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

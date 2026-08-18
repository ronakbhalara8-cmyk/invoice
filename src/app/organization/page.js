'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';

function OrganizationPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState({
        countries: false,
        states: false,
        submit: false
    });
    const [apiError, setApiError] = useState({
        countries: '',
        states: ''
    });
    const [formData, setFormData] = useState({
        organizationName: '',
        industry: 'consulting',
        country: '', // Will be set from API
        state: '',
        currency: 'inr',
        language: 'en',
        timezone: 'gmt+5.30',
        gstRegistered: 'no',
        address: '',
        gstNumber: ''
    });
    const [errors, setErrors] = useState({});
    const [welcomeName, setWelcomeName] = useState('');
    const [pendingRegistration, setPendingRegistration] = useState(null);
    const [isStatesLoaded, setIsStatesLoaded] = useState(false);

    // Fetch countries on component mount
    useEffect(() => {
        fetchCountries();
    }, []);

    // Load organization name and other data from query parameters
    useEffect(() => {
        if (!searchParams) return;

        const queryName = searchParams.get('name');
        const queryEmail = searchParams.get('email');
        const queryCountry = searchParams.get('country');
        const queryPhone = searchParams.get('phone');

        if (queryName) {
            const decodedName = decodeURIComponent(queryName);
            setFormData(prev => ({
                ...prev,
                organizationName: decodedName
            }));
            setWelcomeName(decodedName);
        }

        if (queryName || queryEmail || queryCountry || queryPhone) {
            console.log('Query parameters received:', {
                name: queryName,
                email: queryEmail,
                country: queryCountry,
                phone: queryPhone
            });
        }
    }, [searchParams]);

    // Ensure the signup data still exists
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const raw = sessionStorage.getItem('pendingRegistration');
            if (!raw) {
                throw new Error('Missing pending registration data');
            }

            const parsed = JSON.parse(raw);
            const hasIdentity = parsed && (parsed.email || parsed.companyName || parsed.name);
            if (!hasIdentity) {
                throw new Error('Invalid pending registration data');
            }
        } catch (error) {
            console.error('Registration session missing. Redirecting to signup:', error);
            sessionStorage.removeItem('pendingRegistration');
            toast.error('Registration session expired. Please sign up again.');
            window.location.replace('/');
        }
    }, []);

    // Load pending registration
    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            const raw = sessionStorage.getItem('pendingRegistration');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            setPendingRegistration(parsed);
            const nameToShow = parsed.name || parsed.companyName || parsed.email || '';
            setWelcomeName(nameToShow);

            if (countries.length > 0) {
                const matchedCountry = countries.find((country) => {
                    const countryName = country.name || country.country_name || '';
                    const searchName = parsed.country || '';
                    return countryName.toLowerCase() === searchName.toLowerCase() ||
                        country.iso2?.toLowerCase() === searchName.toLowerCase();
                });

                const nextCountry = matchedCountry?.iso2 || 'IN';
                if (nextCountry && formData.country !== nextCountry) {
                    setFormData(prev => ({ ...prev, country: nextCountry }));
                }
            }
        } catch (err) {
            console.error('Failed to load pending registration:', err);
        }
    }, [countries]);

    // Fetch states when country changes
    useEffect(() => {
        if (formData.country) {
            setIsStatesLoaded(false);
            fetchStates(formData.country);
        } else {
            setStates([]);
            setFormData(prev => ({ ...prev, state: '' }));
            setApiError(prev => ({ ...prev, states: '' }));
        }
    }, [formData.country]);

    const fetchCountries = async () => {
        setLoading(prev => ({ ...prev, countries: true }));
        setApiError(prev => ({ ...prev, countries: '' }));

        try {
            const response = await fetch('/api/countries');
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }

            const countriesData = await response.json();
            if (!Array.isArray(countriesData)) {
                throw new Error('Unexpected country response');
            }

            setCountries(countriesData);

            // Set default country to India (IN)
            const india = countriesData.find((c) => c.iso2 === 'IN');
            if (india) {
                setFormData(prev => ({ ...prev, country: india.iso2 }));
                // States will be fetched via the useEffect
            } else if (countriesData.length > 0) {
                setFormData(prev => ({ ...prev, country: countriesData[0].iso2 }));
            }
        } catch (error) {
            console.error('Error fetching countries:', error);
            setApiError(prev => ({
                ...prev,
                countries: 'Failed to load countries. Please refresh the page and try again.'
            }));
        } finally {
            setLoading(prev => ({ ...prev, countries: false }));
        }
    };

    const fetchStates = async (countryCode) => {
        if (!countryCode) {
            setStates([]);
            setFormData(prev => ({ ...prev, state: '' }));
            setIsStatesLoaded(true);
            return;
        }

        setLoading(prev => ({ ...prev, states: true }));
        setApiError(prev => ({ ...prev, states: '' }));

        try {
            console.log('Fetching states for country code:', countryCode);

            const response = await fetch(`/api/states?country=${encodeURIComponent(countryCode)}`);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('States data received:', data);

            const statesData = Array.isArray(data) ? data : [];
            setStates(statesData);
            setIsStatesLoaded(true);

            // If country is India, set default state to Gujarat
            if (countryCode === 'IN') {
                const gujarat = statesData.find(s =>
                    s.state_code === 'GJ' ||
                    s.name.toLowerCase() === 'gujarat'
                );
                if (gujarat) {
                    setFormData(prev => ({ ...prev, state: gujarat.state_code || gujarat.id }));
                } else if (statesData.length > 0) {
                    setFormData(prev => ({ ...prev, state: statesData[0].state_code || statesData[0].id }));
                } else {
                    setFormData(prev => ({ ...prev, state: '' }));
                }
            } else {
                // For other countries, clear the state field
                setFormData(prev => ({ ...prev, state: '' }));
            }
        } catch (error) {
            console.error('Error fetching states:', error);
            setApiError(prev => ({
                ...prev,
                states: 'Failed to load states. Please try again.'
            }));
            setStates([]);
            setFormData(prev => ({ ...prev, state: '' }));
            setIsStatesLoaded(true);
        } finally {
            setLoading(prev => ({ ...prev, states: false }));
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        if (field === 'country') {
            setApiError(prev => ({ ...prev, states: '' }));
            setFormData(prev => ({ ...prev, state: '' }));
            setStates([]);
            setIsStatesLoaded(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.organizationName.trim()) {
            newErrors.organizationName = 'Organization name is required';
        }
        if (!formData.country) {
            newErrors.country = 'Please select a country';
        }
        if (!formData.state && formData.country) {
            const isIndia = formData.country === 'IN';
            if (isIndia) {
                newErrors.state = 'Please select a state';
            } else {
                newErrors.state = 'Please enter your state/province';
            }
        }
        if (formData.gstRegistered === 'yes' && !formData.gstNumber?.trim()) {
            newErrors.gstNumber = 'GST Number is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(prev => ({ ...prev, submit: true }));

        try {
            const selectedCountry = countries.find(c => c.iso2 === formData.country);
            const selectedState = states.find(s => s.state_code === formData.state || s.id === formData.state);

            const submissionData = {
                ...formData,
                countryName: selectedCountry?.name || formData.country,
                stateName: selectedState?.name || formData.state,
            };

            const registration = pendingRegistration || null;
            if (!registration) {
                toast.error('Missing registration data. Please complete signup first.');
                throw new Error('Missing registration data.');
            }

            if (!registration.email) {
                toast.error('Registration missing email. Please return to signup and provide an email.');
                throw new Error('Missing registration email.');
            }

            const payload = {
                registration,
                organization: submissionData,
            };

            const response = await fetch('/api/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || result?.error) {
                const message = result?.message || 'Failed to save organization';
                if (response.status === 409 || /already exists/i.test(message)) {
                    toast.error(message);
                    return;
                }
                throw new Error(message);
            }

            const profile = {
                name: formData.organizationName || pendingRegistration?.name || pendingRegistration?.companyName || pendingRegistration?.email || 'User',
                email: pendingRegistration?.email || '',
                organizationName: formData.organizationName || pendingRegistration?.companyName || pendingRegistration?.name || 'Organization',
                company_name: formData.organizationName || pendingRegistration?.companyName || pendingRegistration?.name || 'Organization',
                gstNumber: formData.gstNumber || '',
            };

            sessionStorage.setItem('currentUser', JSON.stringify(profile));
            sessionStorage.removeItem('pendingRegistration');
            toast.success('Profile created successfully! Redirecting to dashboard...');

            router.push('/dashboard');

        } catch (error) {
            console.error('Error submitting form:', error);
            toast.error('Failed to save organization details. Please try again.');
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    const retryFetchStates = () => {
        if (formData.country) {
            fetchStates(formData.country);
        }
    };

    const isIndiaSelected = formData.country === 'IN';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-x-hidden">
            {/* Background Effects - Fixed */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-3xl"></div>
                <div className="absolute top-20 right-20 w-60 h-60 bg-pink-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 left-20 w-60 h-60 bg-cyan-200/20 rounded-full blur-3xl"></div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-8">
                <div className="w-full max-w-3xl bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Header with Logo */}
                    <div className="p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xl font-semibold text-gray-800">Invoice</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* Welcome Message */}
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Welcome aboard, {welcomeName || 'there'}! 😊
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Enter your organization details to get started with Invoice.
                            </p>
                        </div>

                        {/* API Error Messages */}
                        {apiError.countries && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-600 text-sm">{apiError.countries}</p>
                                <button
                                    type="button"
                                    onClick={fetchCountries}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Organization Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Organization Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className={`w-full px-4 py-2.5 ${errors.organizationName ? 'border-red-500' : 'border-gray-300'} border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm`}
                                    placeholder="Enter organization name"
                                    value={formData.organizationName}
                                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                                    disabled={loading.submit}
                                />
                                {errors.organizationName && (
                                    <p className="mt-1 text-sm text-red-500">{errors.organizationName}</p>
                                )}
                            </div>

                            {/* Industry */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Industry <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white/50 backdrop-blur-sm transition-all"
                                        value={formData.industry}
                                        onChange={(e) => handleInputChange('industry', e.target.value)}
                                        disabled={loading.submit}
                                    >
                                        <option value="consulting">Consulting</option>
                                        <option value="technology">Technology</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="retail">Retail</option>
                                        <option value="manufacturing">Manufacturing</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Country */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Country <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            className={`w-full px-4 py-2.5 border ${errors.country ? 'border-red-500' : 'border-gray-300'
                                                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white/50 backdrop-blur-sm transition-all`}
                                            value={formData.country}
                                            onChange={(e) => handleInputChange('country', e.target.value)}
                                            disabled={loading.countries || loading.submit}
                                        >
                                            <option value="">Select Country</option>
                                            {countries.map((country) => (
                                                <option key={country.id} value={country.iso2}>
                                                    {country.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                            {loading.countries ? (
                                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                    {errors.country && (
                                        <p className="mt-1 text-sm text-red-500">{errors.country}</p>
                                    )}
                                </div>

                                {/* State/Union Territory */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        {isIndiaSelected ? 'State' : 'State/Province'} {isIndiaSelected && <span className="text-red-500">*</span>}
                                    </label>
                                    {isIndiaSelected ? (
                                        <>
                                            <div className="relative">
                                                <select
                                                    className={`w-full px-4 py-2.5 border ${errors.state ? 'border-red-500' : 'border-gray-300'
                                                        } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white/50 backdrop-blur-sm transition-all`}
                                                    value={formData.state}
                                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                                    disabled={loading.states || loading.submit || !isStatesLoaded}
                                                >
                                                    <option value="">{loading.states ? 'Loading states...' : 'Select State'}</option>
                                                    {states.map((state) => (
                                                        <option key={state.id} value={state.state_code || state.id}>
                                                            {state.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                                    {loading.states ? (
                                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                            {apiError.states && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-red-500">{apiError.states}</p>
                                                    <button
                                                        type="button"
                                                        onClick={retryFetchStates}
                                                        className="mt-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        Retry
                                                    </button>
                                                </div>
                                            )}
                                            {errors.state && (
                                                <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                className={`w-full px-4 py-2.5 border ${errors.state ? 'border-red-500' : 'border-gray-300'
                                                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm`}
                                                placeholder="Enter state/province"
                                                value={formData.state}
                                                onChange={(e) => handleInputChange('state', e.target.value)}
                                                disabled={loading.submit}
                                            />
                                            {errors.state && (
                                                <p className="mt-1 text-sm text-red-500">{errors.state}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Organization Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Organization Address (optional)
                                </label>
                                <textarea
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm"
                                    placeholder="Enter organization address (optional)"
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    disabled={loading.submit}
                                    rows={3}
                                />
                            </div>

                            {/* GST Registration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Is this business registered for GST?
                                </label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gst"
                                            value="yes"
                                            checked={formData.gstRegistered === 'yes'}
                                            onChange={(e) => handleInputChange('gstRegistered', e.target.value)}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            disabled={loading.submit}
                                        />
                                        <span className="text-gray-700">Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gst"
                                            value="no"
                                            checked={formData.gstRegistered === 'no'}
                                            onChange={(e) => handleInputChange('gstRegistered', e.target.value)}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            disabled={loading.submit}
                                        />
                                        <span className="text-gray-700">No</span>
                                    </label>
                                </div>
                                {formData.gstRegistered === 'yes' && (
                                    <div className="mt-2">
                                        <input
                                            type="text"
                                            className={`max-w-[300px] w-full px-4 py-2.5 border ${errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                                                } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white/50 backdrop-blur-sm`}
                                            placeholder="Enter GST Number"
                                            value={formData.gstNumber || ''}
                                            onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                                        />
                                        {errors.gstNumber && (
                                            <p className="mt-1 text-sm text-red-500">{errors.gstNumber}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Note */}
                            <div className="bg-blue-50/50 backdrop-blur-sm rounded-lg p-4 border border-blue-100 mt-4">
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Note:</span> You can update some of these preferences from Settings anytime.
                                </p>
                                <p className="text-sm text-gray-600 mt-2">
                                    The language you select on this page will be the default language for the following features even if you change the language later:
                                </p>
                                <ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
                                    <li>Email Templates</li>
                                    <li>Template Customizations</li>
                                    <li>Payment Modes</li>
                                </ul>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={loading.submit}
                                >
                                    {loading.submit ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Saving...
                                        </span>
                                    ) : (
                                        'Get Started'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => window.history.back()}
                                    disabled={loading.submit}
                                >
                                    Go Back
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrganizationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center text-slate-600">
                Loading organization setup...
            </div>
        }>
            <OrganizationPageContent />
        </Suspense>
    );
}
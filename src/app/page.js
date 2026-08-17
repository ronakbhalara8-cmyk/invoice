"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  Building2,
  Phone,
  Mail,
  LockKeyhole,
  MapPin,
  ChevronDown,
  EyeOff,
  Eye,
} from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Home() {
  const router = useRouter();
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [googleCredential, setGoogleCredential] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [selectedCountry, setSelectedCountry] = useState("India");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+91");
  const [selectedState, setSelectedState] = useState("Gujarat");

  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);
  const codeDropdownRef = useRef(null);
  const googleButtonRef = useRef(null);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);

        const response = await fetch("/api/countries");

        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }

        const countryList = await response.json();

        if (Array.isArray(countryList) && countryList.length > 0) {
          setCountries(countryList);

          const india = countryList.find(
            (country) => country.name.toLowerCase() === "india"
          );

          if (india) {
            setSelectedCountry(india.name);
            setSelectedCountryCode(india.dialCode);
          }
        }
      } catch (error) {
        console.error("Country API Error:", error);
        setCountries([]);
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      if (selectedCountry !== "India") {
        setStates([]);
        setSelectedState("");
        return;
      }

      try {
        setLoadingStates(true);

        const response = await fetch(
          `/api/states?country=${encodeURIComponent(selectedCountry)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch states");
        }

        const stateList = await response.json();

        if (Array.isArray(stateList) && stateList.length > 0) {
          setStates(stateList);

          const gujarat = stateList.find(
            (state) => state.name.toLowerCase() === "gujarat"
          );

          if (gujarat) {
            setSelectedState(gujarat.name);
          } else {
            setSelectedState(stateList[0]?.name || "");
          }
          return;
        }

        setStates([]);
        setSelectedState("");
      } catch (error) {
        console.error("State API Error:", error);
        setStates([]);
        setSelectedState("");
      } finally {
        setLoadingStates(false);
      }
    };

    fetchStates();
  }, [selectedCountry]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        codeDropdownRef.current &&
        !codeDropdownRef.current.contains(event.target)
      ) {
        setCodeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Google Sign-In initialization
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("google-identity-script")) {
      // Script already exists, just render the button
      if (window.google?.accounts?.id && !isLoginMode && !googleProfile) {
        renderGoogleButton();
      }
      return;
    }

    const decodeJwtPayload = (token) => {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );

        return JSON.parse(jsonPayload);
      } catch (error) {
        console.error("JWT decode error:", error);
        return null;
      }
    };

    if (!GOOGLE_CLIENT_ID) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-identity-script";
    script.onload = () => {
      if (!window.google?.accounts?.id) return;
      setGoogleScriptLoaded(true);

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response?.credential) {
            toast.error("Google sign-in failed. Please try again.");
            return;
          }

          const payload = decodeJwtPayload(response.credential);

          if (!payload?.email) {
            toast.error("Unable to read Google account details.");
            return;
          }

          try {
            setGoogleLoading(true);
            const loginResponse = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken: response.credential,
                email: payload.email,
              }),
            });

            if (loginResponse.status === 200) {
              const data = await loginResponse.json();
              toast.success('Login successful!');
              setTimeout(() => {
                router.push('/dashboard');
              }, 500);
              return;
            } else if (loginResponse.status === 404) {
              setGoogleCredential(response.credential);
              setGoogleProfile({
                email: payload.email,
                name: payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim(),
                givenName: payload.given_name || "",
                familyName: payload.family_name || "",
                picture: payload.picture || "",
              });
              setEmail(payload.email || "");
              setIsLoginMode(false);
            } else {
              toast.error('An error occurred. Please try again.');
            }
          } catch (error) {
            console.error('Google auth check error:', error);
            toast.error('Authentication failed. Please try again.');
          } finally {
            setGoogleLoading(false);
          }
        },
        ux_mode: "popup",
      });

      // Render Google button if in register mode
      if (!isLoginMode && !googleProfile) {
        renderGoogleButton();
      }
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount to avoid re-downloading
    };
  }, []);

  // Handle Google button rendering when mode changes
  useEffect(() => {
    if (googleScriptLoaded || window.google?.accounts?.id) {
      if (!isLoginMode && !googleProfile) {
        // Show and render Google button in register mode
        if (googleButtonRef.current) {
          googleButtonRef.current.style.display = 'block';
          renderGoogleButton();
        }
      } else {
        // Hide Google button in login mode or when Google profile exists
        if (googleButtonRef.current) {
          googleButtonRef.current.style.display = 'none';
        }
      }
    }
  }, [isLoginMode, googleProfile, googleScriptLoaded]);

  const renderGoogleButton = () => {
    const buttonContainer = document.getElementById("google-signin-button");
    if (!buttonContainer) return;

    if (window.google?.accounts?.id) {
      // Clear previous button
      buttonContainer.innerHTML = '';

      window.google.accounts.id.renderButton(
        buttonContainer,
        {
          theme: "outline",
          size: "large",
          width: 210,
          type: "standard",
          text: "signin_with",
        }
      );
    }
  };

  const handleCountryChange = (e) => {
    const countryName = e.target.value;

    const country = countries.find(
      (item) => item.name === countryName
    );

    setSelectedCountry(countryName);

    if (country) {
      setSelectedCountryCode(country.dialCode || "");
    } else {
      setSelectedCountryCode("");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleLoginPasswordVisibility = () => {
    setLoginShowPassword(!loginShowPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginEmail?.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    if (!loginPassword?.trim()) {
      toast.error("Please enter your password.");
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.status === 200) {
        toast.success('Login successful!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      } else {
        toast.error(data.message || 'Invalid email or password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleRegistration = async () => {
    if (!googleProfile || !googleCredential) {
      toast.error("Please sign in with Google first.");
      return;
    }

    if (!phone?.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    try {
      const pending = {
        companyName,
        phone,
        email: googleProfile?.email || email,
        name: googleProfile?.name || null,
        password: null,
        country: selectedCountry,
        countryCode: selectedCountryCode,
        state: selectedCountry === "India" ? selectedState : null,
        via: 'google'
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingRegistration', JSON.stringify(pending));

        const params = new URLSearchParams({
          name: pending.name || pending.companyName || pending.email || '',
          email: pending.email || '',
          country: pending.country || '',
          phone: pending.phone || '',
        });

        setTimeout(() => {
          router.push(`/organization?${params.toString()}`);
        }, 100);
      }
    } catch (error) {
      console.error("Google registration error:", error);
      toast.error("Google registration failed. Please try again later.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (googleProfile) {
      await handleGoogleRegistration();
      return;
    }

    if (!companyName?.trim()) {
      toast.error("Please enter a company name.");
      return;
    }

    if (!email?.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    if (!phone?.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }

    if (!password?.trim()) {
      toast.error("Please enter a password.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    const formData = {
      companyName,
      phone,
      email,
      password,
      country: selectedCountry,
      countryCode: selectedCountryCode,
      state: selectedCountry === "India" ? selectedState : null,
    };
    try {
      const pending = {
        ...formData,
        country: selectedCountry,
        state: selectedCountry === "India" ? selectedState : null,
        via: 'email'
      };

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingRegistration', JSON.stringify(pending));

        const params = new URLSearchParams({
          name: pending.companyName || pending.email || '',
          email: pending.email || '',
          country: pending.country || '',
          phone: pending.phone || '',
        });

        setTimeout(() => {
          router.push(`/organization?${params.toString()}`);
        }, 100);
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again later.');
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef2f1]">

      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=2400&q=90')",
        }}
      />

      <div className="absolute inset-0 bg-white/85" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/25 to-white/45" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[500px] font-sans">
          <div className="mb-7 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1677e8] shadow-lg">
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.8"
                >
                  <path d="M6 3h9l4 4v14H6z" />
                  <path d="M14 3v5h5" />
                  <path d="M9 12h6" />
                  <path d="M9 16h6" />
                </svg>
              </div>
            </div>

            <h1 className="text-[22px] font-semibold tracking-tight text-[#172033]">
              InvoiceFlow
            </h1>

            <p className="mt-1 text-[13px] text-[#596273]">
              {isLoginMode ? 'Welcome back! Sign in to your account' : 'Smart & simple invoice management'}
            </p>
          </div>

          <div className="rounded-[14px] border border-white/90 bg-white/96 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-sm sm:p-8">
            <div className="flex mb-6 border-b border-[#dfe3e8]">
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(false);
                }}
                className={`flex-1 pb-3 text-center text-sm font-medium transition-colors ${!isLoginMode
                  ? 'text-[#1677e8] border-b-2 border-[#1677e8]'
                  : 'text-[#7c8490] hover:text-[#1f2937]'
                  }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLoginMode(true);
                }}
                className={`flex-1 pb-3 text-center text-sm font-medium transition-colors ${isLoginMode
                  ? 'text-[#1677e8] border-b-2 border-[#1677e8]'
                  : 'text-[#7c8490] hover:text-[#1f2937]'
                  }`}
              >
                Sign In
              </button>
            </div>

            {isLoginMode ? (
              <form onSubmit={handleLogin}>
                <div className="space-y-[13px]">
                  <div className="relative">
                    <Mail
                      size={18}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                    />

                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Email Address"
                      autoComplete="email"
                      className="h-[54px] w-full rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-4 text-[15px] text-[#1f2937] outline-none transition placeholder:text-[#7c8490] focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10"
                      required
                    />
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      strokeWidth={1.5}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                    />

                    <input
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      type={loginShowPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="h-[54px] w-full rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-4 text-[15px] text-[#1f2937] outline-none transition placeholder:text-[#7c8490] focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10"
                      required
                    />

                    <button
                      type="button"
                      onClick={toggleLoginPasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200"
                      aria-label={loginShowPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                    >
                      {loginShowPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="mt-7 h-[49px] cursor-pointer w-full rounded-[7px] bg-[#1677e8] text-[14px] font-medium text-white shadow-[0_5px_15px_rgba(22,119,232,0.20)] transition hover:bg-[#0969d8] hover:shadow-[0_8px_20px_rgba(22,119,232,0.25)] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loginLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <div className="mb-5">
                    {googleProfile && (
                      <div className="mt-4 rounded-[14px] border border-[#dfe3e8] bg-[#f8fafc] p-4 text-[#111827]">
                        <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#e2e8f0]">
                            {googleProfile.picture ? (
                              <img
                                src={googleProfile.picture}
                                alt={googleProfile.name || "Google User"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-xl font-semibold text-[#1f2937]">
                                {googleProfile.name?.charAt(0).toUpperCase() || "U"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#111827]">
                              Google account selected
                            </p>
                            <p className="mt-1 truncate text-base font-medium text-[#111827]">
                              {googleProfile.name || "Google User"}
                            </p>
                            <p className="mt-1 text-sm text-[#57606a] truncate">
                              {googleProfile.email}
                            </p>
                            <p className="mt-2 text-sm text-[#57606a]">
                              {phone ? `Mobile: ${selectedCountryCode} ${phone}` : "Add your mobile number"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGoogleCredential(null);
                            setGoogleProfile(null);
                            setEmail("");
                            // Show Google button again after clearing profile
                            setTimeout(() => {
                              if (googleButtonRef.current && !isLoginMode) {
                                googleButtonRef.current.style.display = 'block';
                                renderGoogleButton();
                              }
                            }, 100);
                          }}
                          className="mt-4 rounded-[7px] border border-[#dfe3e8] bg-white px-3 py-2 text-[13px] text-[#1677e8] transition hover:bg-[#f8fafc]"
                        >
                          Use another Google account
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-[13px]">
                    {!googleProfile && (
                      <div className="relative">
                        <Building2
                          size={18}
                          strokeWidth={1.5}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                        />

                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Company Name"
                          autoComplete="organization"
                          className="h-[54px] w-full rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-4 text-[15px] text-[#1f2937] outline-none transition placeholder:text-[#7c8490] focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10"
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail
                        size={18}
                        strokeWidth={1.5}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                      />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => !googleProfile && setEmail(e.target.value)}
                        placeholder="Email Address"
                        autoComplete="email"
                        readOnly={!!googleProfile}
                        className="h-[54px] w-full rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-4 text-[15px] text-[#1f2937] outline-none transition placeholder:text-[#7c8490] focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10"
                        required
                      />
                    </div>

                    <div className="relative flex h-[54px] w-full overflow-visible rounded-[7px] border border-[#dfe3e8] bg-white transition focus-within:border-[#1677e8] focus-within:ring-2 focus-within:ring-[#1677e8]/10">
                      <Phone
                        size={18}
                        strokeWidth={1.5}
                        className="ml-3.5 shrink-0 self-center text-[#a6adb7]"
                      />

                      <div className="relative ml-2 flex items-center pr-2" ref={codeDropdownRef}>
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={codeDropdownOpen}
                          onClick={() => setCodeDropdownOpen((open) => !open)}
                          className="h-full min-w-[45px] appearance-none cursor-pointer bg-transparent pl-1 text-[14px] font-medium text-[#111827] text-left outline-none"
                        >
                          {selectedCountryCode || "Code"}
                        </button>

                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-1 text-[#9ca3af]"
                        />

                        {codeDropdownOpen && (
                          <ul className="absolute -left-10 top-full z-50 mt-1 max-h-100 min-w-[300px] w-full overflow-auto rounded-lg border border-[#e5e7eb] bg-white shadow-lg">
                            {countries.map((country, index) => (
                              <li
                                key={`${country.iso3}-${index}`}
                                role="option"
                                tabIndex={0}
                                onClick={() => {
                                  setSelectedCountry(country.name);
                                  setSelectedCountryCode(country.dialCode);
                                  setCodeDropdownOpen(false);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    setSelectedCountry(country.name);
                                    setSelectedCountryCode(country.dialCode);
                                    setCodeDropdownOpen(false);
                                  }
                                }}
                                className="cursor-pointer px-3 py-2 text-[14px] text-[#111827] transition hover:bg-[#f3f4f6]"
                              >
                                {country.dialCode} {country.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <input
                        type="number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Phone Number"
                        autoComplete="tel"
                        className="min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#1f2937] outline-none placeholder:text-[#7c8490]"
                        required
                      />
                    </div>

                    {!googleProfile && (
                      <div className="relative">
                        <LockKeyhole
                          size={18}
                          strokeWidth={1.5}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                        />

                        <input
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Password"
                          autoComplete="current-password"
                          className="h-[54px] w-full rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-4 text-[15px] text-[#1f2937] outline-none transition placeholder:text-[#7c8490] focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10"
                          required
                        />

                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors duration-200`}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          tabIndex={0}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    )}

                    {!googleProfile && (
                      <div className="relative">
                        <MapPin
                          size={18}
                          strokeWidth={1.5}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                        />

                        <select
                          value={selectedCountry}
                          onChange={handleCountryChange}
                          disabled={loadingCountries}
                          className="h-[54px] w-full appearance-none rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-10 text-[15px] text-[#111827] outline-none transition focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10 disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                        >
                          {loadingCountries ? (
                            <option>Loading countries...</option>
                          ) : (
                            countries.map((country, index) => (
                              <option
                                key={`${country.iso3}-${index}`}
                                value={country.name}
                              >
                                {country.name}
                              </option>
                            ))
                          )}
                        </select>

                        <ChevronDown
                          size={18}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8c939c]"
                        />
                      </div>
                    )}

                    {(selectedCountry === "India" && !googleProfile) && (
                      <div className="relative">

                        <MapPin
                          size={18}
                          strokeWidth={1.5}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a6adb7]"
                        />

                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          disabled={loadingStates}
                          className="h-[54px] w-full appearance-none rounded-[7px] border border-[#dfe3e8] bg-white pl-11 pr-10 text-[15px] text-[#111827] outline-none transition focus:border-[#1677e8] focus:ring-2 focus:ring-[#1677e8]/10 disabled:cursor-not-allowed disabled:bg-[#f8f9fa]"
                        >
                          {loadingStates ? (
                            <option>Loading states...</option>
                          ) : (
                            states.map((state, index) => (
                              <option
                                key={`${state.state_code}-${index}`}
                                value={state.name}
                              >
                                {state.name}
                              </option>
                            ))
                          )}
                        </select>

                        <ChevronDown
                          size={18}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8c939c]"
                        />
                      </div>
                    )}
                  </div>

                  <label className="mt-3 inline-flex cursor-pointer items-start gap-2 text-[13px] leading-5 text-[#303640]">

                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-[2px] h-[14px] w-[14px] cursor-pointer accent-[#1677e8]"
                    />

                    <span>
                      I agree to the{" "}
                      <a
                        href="/#"
                        className="text-[#006cff] hover:underline"
                      >
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a
                        href="/#"
                        className="text-[#006cff] hover:underline"
                      >
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>

                  <div className="mt-7 flex items-center justify-between gap-3">
                    {!googleProfile && (
                      <div
                        id="google-signin-button"
                        ref={googleButtonRef}
                        className=""
                      />
                    )}
                    <button
                      type="submit"
                      className="py-2.5 cursor-pointer w-full rounded-[7px] bg-[#1677e8] text-[14px] font-medium text-white shadow-[0_5px_15px_rgba(22,119,232,0.20)] transition hover:bg-[#0969d8] hover:shadow-[0_8px_20px_rgba(22,119,232,0.25)] active:scale-[0.99]"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </>
            )}

            <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-[#4b4b4b]">
              🔒 Secure & encrypted login
            </div>
            <p className="mt-2 text-sm text-center text-[#4b4b4b]">
              © 2026 InvoiceFlow · Terms · Privacy
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
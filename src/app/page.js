"use client";

import { useEffect, useRef, useState } from "react";
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

const API_BASE = "https://countriesnow.space/api/v0.1";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Home() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [googleCredential, setGoogleCredential] = useState(null);
  const [googleProfile, setGoogleProfile] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true);

        const response = await fetch(`${API_BASE}/countries/codes`);

        if (!response.ok) {
          throw new Error("Failed to fetch countries");
        }

        const result = await response.json();

        if (!result.error && result.data) {
          const countryList = result.data.map((country) => ({
            name: country.name,
            iso2: country.iso2,
            iso3: country.iso3,
            dialCode: country.dial_code,
          }));

          setCountries(countryList);

          // Default India
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
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchStates = async () => {
      // State only required for India
      if (selectedCountry !== "India") {
        setStates([]);
        setSelectedState("");
        return;
      }

      try {
        setLoadingStates(true);

        const response = await fetch(`${API_BASE}/countries/states`);

        if (!response.ok) {
          throw new Error("Failed to fetch states");
        }

        const result = await response.json();

        if (!result.error && result.data) {
          const countryEntry = result.data.find(
            (country) => country.name.toLowerCase() === selectedCountry.toLowerCase()
          );
          const stateList = countryEntry?.states || [];

          setStates(stateList);

          // Default Gujarat
          const gujarat = stateList.find(
            (state) => state.name.toLowerCase() === "gujarat"
          );

          if (gujarat) {
            setSelectedState(gujarat.name);
          } else {
            setSelectedState(stateList[0]?.name || "");
          }
        }
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("google-identity-script")) return;

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

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (!response?.credential) {
            toast.error("Google sign-in failed. Please try again.");
            return;
          }

          const payload = decodeJwtPayload(response.credential);

          if (!payload?.email) {
            toast.error("Unable to read Google account details.");
            return;
          }

          setGoogleCredential(response.credential);
          setGoogleProfile({
            email: payload.email,
            name: payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim(),
            givenName: payload.given_name || "",
            familyName: payload.family_name || "",
            picture: payload.picture || "",
          });
          setEmail(payload.email || "");
        },
        ux_mode: "popup",
      });

      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-button"),
        {
          theme: "outline",
          size: "large",
          width: 320,
          type: "standard",
          text: "signin_with",
        }
      );
    };

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const handleCountryChange = (e) => {
    const countryName = e.target.value;

    const country = countries.find(
      (item) => item.name === countryName
    );

    setSelectedCountry(countryName);

    if (country) {
      setSelectedCountryCode(country.dialCode || "");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleGoogleRegistration = async () => {
    if (!googleProfile || !googleCredential) {
      toast.error("Please sign in with Google first.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    try {
      if (!agreeTerms) {
        toast.error("Please agree to the Terms of Service and Privacy Policy.");
        return;
      }

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
        const redirectName = pending.name || pending.companyName || pending.email || '';
        window.location.href = `/organization?name=${encodeURIComponent(redirectName)}`;
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
        const redirectName = pending.companyName || pending.email || '';
        window.location.href = `/organization?name=${encodeURIComponent(redirectName)}`;
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

      {/* Light overlay - image still clearly visible */}
      <div className="absolute inset-0 bg-white/85" />
      {/* Soft gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/55 via-white/25 to-white/45" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[430px] font-sans">
          {/* Logo */}
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
              Smart & simple invoice management
            </p>
          </div>

          <div className="rounded-[14px] border border-white/90 bg-white/96 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-sm sm:p-8">
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
                          {phone ? `Mobile: ${selectedCountryCode} ${phone}` : "Add your mobile number below to continue."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleCredential(null);
                        setGoogleProfile(null);
                        setEmail("");
                      }}
                      className="mt-4 rounded-[7px] border border-[#dfe3e8] bg-white px-3 py-2 text-[13px] text-[#1677e8] transition hover:bg-[#f8fafc]"
                    >
                      Use another Google account
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-[13px]">
                {/* COMPANY NAME */}
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

                {/* EMAIL */}
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

                {/* PHONE */}
                <div className="relative flex h-[54px] w-full overflow-visible rounded-[7px] border border-[#dfe3e8] bg-white transition focus-within:border-[#1677e8] focus-within:ring-2 focus-within:ring-[#1677e8]/10">
                  <Phone
                    size={18}
                    strokeWidth={1.5}
                    className="ml-3.5 shrink-0 self-center text-[#a6adb7]"
                  />

                  {/* COUNTRY CODE */}
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
                    type="tel"
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

                {/* COUNTRY */}
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

                {/* STATE - INDIA ONLY */}
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

              {/* TERMS */}
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[13px] leading-5 text-[#303640]">

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

              {/* BUTTON */}
              <button
                type="submit"
                className="mt-7 h-[49px] cursor-pointer  w-full rounded-[7px] bg-[#1677e8] text-[14px] font-medium text-white shadow-[0_5px_15px_rgba(22,119,232,0.20)] transition hover:bg-[#0969d8] hover:shadow-[0_8px_20px_rgba(22,119,232,0.25)] active:scale-[0.99]"
              >
                Create Account
              </button>
            </form>

            {/* Gmail Sign-In Button */}
            {!googleProfile && (
              <div id="google-signin-button" className="my-5 w-full flex justify-center" />
            )}
            {/* Security */}
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-[#9aa1ac]">
              🔒 Secure & encrypted login
            </div>
            <p className="mt-2 text-[10px] text-center text-[#7d8591]">
              © 2026 InvoiceFlow · Terms · Privacy
            </p>
          </div>
        </div>
      </div>
    </main >
  );
}
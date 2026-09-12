"use client";
import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

const SECTORS = [
  { value: "RIDE_HAILING", label: "Ride-Hailing" },
  { value: "FOOD_DELIVERY", label: "Food Delivery" },
  { value: "LOGISTICS_DELIVERY", label: "Logistics & Delivery" },
  { value: "MARKETPLACE_FREELANCE", label: "Marketplace / Freelance" },
  { value: "HEALTHCARE_PERSONAL_SERVICES", label: "Healthcare & Personal Services" },
  { value: "OTHER", label: "Other" },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    companyName: "",
    sector: "LOGISTICS_DELIVERY",
    cinOrRegistration: "",
    gstin: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Registration failed");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (err) {
      console.error("Registration request failed:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/30 via-surface to-surface" />
        <div className="relative w-full max-w-md text-center animate-slide-up">
          <div className="card p-10">
            <div className="w-16 h-16 rounded-full bg-accent-emerald/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-accent-emerald" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Account Created!</h2>
            <p className="text-text-secondary text-sm mb-6">
              Your account has been created successfully. You can now sign in to access your compliance dashboard.
            </p>
            <Link href="/login" className="btn-primary w-full">
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/30 via-surface to-surface" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary-500/8 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-lg animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">GigCessHQ</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary text-sm">Start tracking compliance for your gig workforce</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="reg-name" className="label">Your Name</label>
              <input
                id="reg-name"
                type="text"
                className="input"
                placeholder="Rajesh Kumar"
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="reg-email" className="label">Work Email</label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder="ops@company.in"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-company" className="label">Company Name</label>
            <input
              id="reg-company"
              type="text"
              className="input"
              placeholder="QuickDrop Logistics Pvt. Ltd."
              value={formData.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="reg-sector" className="label">Sector</label>
            <select
              id="reg-sector"
              className="input"
              value={formData.sector}
              onChange={(e) => updateField("sector", e.target.value)}
            >
              {SECTORS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-cin" className="label">CIN / PAN <span className="text-text-muted">(Optional)</span></label>
              <input
                id="reg-cin"
                type="text"
                className="input"
                placeholder="U74999MH2024..."
                value={formData.cinOrRegistration}
                onChange={(e) => updateField("cinOrRegistration", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="reg-gstin" className="label">GSTIN <span className="text-text-muted">(Optional)</span></label>
              <input
                id="reg-gstin"
                type="text"
                className="input"
                placeholder="27AABCQ1234A1Z5"
                value={formData.gstin}
                onChange={(e) => updateField("gstin", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                className="input pr-10"
                placeholder="Min 8 chars, 1 uppercase, 1 digit"
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <p className="text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

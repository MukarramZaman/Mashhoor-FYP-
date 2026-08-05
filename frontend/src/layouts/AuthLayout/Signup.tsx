import { useState } from "react";
import { Title } from "../../components";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type Role = "business" | "influencer";

function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCampaignId = searchParams.get("campaign");
  const inviteToken = searchParams.get("invite");

  const [accountType, setAccountType] = useState<Role>(
    (searchParams.get("role") as Role) || "influencer"
  );
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required.";
    if (!form.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Enter a valid email.";
    if (!form.password) newErrors.password = "Password is required.";
    else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    if (!form.agreed) newErrors.agreed = "You must agree to the terms.";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      await register(
        form.name,
        form.email,
        form.password,
        accountType,
        inviteToken || undefined
      );
      navigate(
        inviteCampaignId && accountType === "influencer"
          ? "/influencer-requests"
          : accountType === "business"
            ? "/business-dashboard"
            : "/influencer-dashboard"
      );
    } catch (err: unknown) {
      setErrors({
        general: err instanceof Error ? err.message : "Signup failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex flex-col justify-center items-center p-4">
      <div className="m-8 flex flex-col justify-center items-center text-center">
        <Link to="/">
          <Title />
        </Link>
        <div className="text-gray-500 text-lg m-2">Create your account to get started</div>
      </div>

      <div className="login-card rounded-2xl p-8 w-full max-w-137.5">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Create an Account</h2>
          <p className="text-gray-400 text-sm">Choose your account type and fill in your details</p>
          {inviteToken && (
            <div className="mt-3 text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
              You were invited to collaborate on Mashhoor
              {inviteCampaignId ? " for a campaign" : ""}. Sign up as an influencer to accept.
            </div>
          )}
        </div>

        {/* Account type toggle */}
        <div className="toggle-bg mb-6">
          <div
            className={`toggle-item ${accountType === "business" ? "active" : ""}`}
            onClick={() => setAccountType("business")}
          >
            <img src="/assets/briefcase-business.svg" alt="Business" width={16} height={16} />
            Business Account
          </div>
          <div
            className={`toggle-item ${accountType === "influencer" ? "active" : ""}`}
            onClick={() => setAccountType("influencer")}
          >
            <img src="/assets/user.svg" alt="Influencer" width={16} height={16} />
            Influencer Account
          </div>
        </div>

        {errors.general && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {accountType === "business" ? "Company Name" : "Full Name"}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img
                  src={accountType === "business" ? "/assets/briefcase-business.svg" : "/assets/user.svg"}
                  alt="Name" width={18} height={18}
                />
              </div>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={accountType === "business" ? "Your Company Ltd." : "John Doe"}
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {accountType === "business" ? "Business Email" : "Email"}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/mail.svg" alt="Email" width={18} height={18} />
              </div>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={accountType === "business" ? "you@company.com" : "you@example.com"}
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/lock.svg" alt="Password" width={18} height={18} />
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/lock.svg" alt="Confirm Password" width={18} height={18} />
              </div>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Terms */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="agreed"
              checked={form.agreed}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-500">
              I agree to the{" "}
              <a href="#" className="text-gray-700 font-medium hover:underline">Terms & Conditions</a>{" "}
              and{" "}
              <a href="#" className="text-gray-700 font-medium hover:underline">Privacy Policy</a>
            </span>
          </div>
          {errors.agreed && <p className="text-red-500 text-xs">{errors.agreed}</p>}

          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className={`disabled:opacity-60 ${accountType === "influencer" ? "btn-create-influencer" : "btn-create-business"}`}
            >
              {loading ? "Creating account..." : accountType === "influencer" ? "Create Influencer Account" : "Create Business Account"}
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-gray-900 font-bold cursor-pointer hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>

      <Link to="/" className="mt-8 text-gray-900 font-medium cursor-pointer hover:text-gray-600 text-sm">
        Back to home
      </Link>
    </div>
  );
}

export default SignUp;

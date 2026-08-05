import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Title } from "../../components";
import { useAuth } from "../../context/AuthContext";

type Role = "business" | "influencer";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [selectedRole, setSelectedRole] = useState<Role>("business");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password, selectedRole);
      navigate(
        selectedRole === "business"
          ? "/business-dashboard"
          : "/influencer-dashboard"
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex flex-col justify-center items-center p-4">
      <div className="m-6 flex flex-col justify-center items-center text-center">
        <Link to="/">
          <Title />
        </Link>
        <div className="text-gray-500 text-lg m-2">
          Welcome back! Please login to continue
        </div>
      </div>

      <div className="login-card rounded-2xl p-8 w-full max-w-120">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Login to Your Account</h2>
          <p className="text-gray-400 mt-1 text-sm">
            Enter your credentials to access the platform
          </p>
        </div>

        {/* Role selector */}
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole("business")}
            className={`flex-1 btn-login-outline rounded-lg py-3 flex justify-center items-center gap-2 font-medium transition-all ${selectedRole === "business" ? "border-purple-500 text-purple-600 bg-purple-50" : ""
              }`}
          >
            <img src="/assets/briefcase-business.svg" alt="Business" width={16} height={16} />
            Business
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("influencer")}
            className={`flex-1 btn-login-primary rounded-lg py-3 flex justify-center items-center gap-2 font-medium transition-all ${selectedRole === "influencer" ? "opacity-100" : "opacity-60"
              }`}
          >
            <img src="/assets/userWhite.svg" alt="Influencer" width={16} height={16} />
            Influencer
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/mail.svg" alt="Email" width={18} height={18} />
              </div>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
          </div>

          <div className="mb-6">
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
                placeholder="Enter your password"
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/reset" className="text-sm font-medium text-gray-900 hover:text-purple-600">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-login-primary rounded-lg py-3 font-medium mb-4 disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : `Login as ${selectedRole === "business" ? "Business" : "Influencer"}`}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-gray-900 font-bold cursor-pointer hover:underline">
            Sign up
          </Link>
        </div>
      </div>

      <Link to="/" className="mt-8 text-gray-900 font-medium cursor-pointer hover:text-gray-600">
        Back to home
      </Link>
    </div>
  );
}

export default Login;

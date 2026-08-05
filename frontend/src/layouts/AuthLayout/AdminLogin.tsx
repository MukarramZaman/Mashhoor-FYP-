import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Title } from "../../components";
import { useAuth } from "../../context/AuthContext";

function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
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
      await login(form.email, form.password, "admin");
      navigate("/admin/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex flex-col justify-center items-center p-4 min-h-screen">
      <div className="m-6 flex flex-col justify-center items-center text-center">
        <Link to="/">
          <Title />
        </Link>
        <div className="text-gray-500 text-lg m-2">
          Administrator Portal
        </div>
      </div>

      <div className="login-card rounded-2xl p-8 w-full max-w-md bg-white shadow-xl border-t-4 border-gray-800">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src="/assets/lock.svg" alt="Admin" width={24} height={24} className="opacity-70" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Restricted access portal
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/mail.svg" alt="Email" width={18} height={18} />
              </div>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full rounded-lg py-3 pl-10 pr-4 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all"
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
                placeholder="Enter password"
                className="w-full rounded-lg py-3 pl-10 pr-4 text-gray-900 border border-gray-300 focus:ring-2 focus:ring-gray-800 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-lg py-3.5 font-medium transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading ? (
              "Authenticating..."
            ) : (
              <>
                Login to Dashboard
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>
      </div>
      
      <Link to="/" className="mt-8 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors">
        ← Back to public site
      </Link>
    </div>
  );
}

export default AdminLogin;

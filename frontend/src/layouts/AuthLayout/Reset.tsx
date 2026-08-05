import { useState } from "react";
import { Link } from "react-router-dom";
import { Title } from "../../components";
import { authApi, type UserRole } from "../../api/authApi";

function Reset() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("business");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const msg = await authApi.forgotPassword(email, role);
      setMessage(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg flex flex-col justify-center items-center p-4">
      <div className="mb-8 flex justify-center items-center flex-col text-center">
        <Link to="/">
          <Title />
        </Link>
        <div className="text-gray-500 text-lg mt-2">
          Reset your password to regain access
        </div>
      </div>

      <div className="login-card rounded-2xl p-8 w-full max-w-120">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reset your password</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Enter your email and account type. We&apos;ll send you a reset link.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Account type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="login-input w-full rounded-lg py-3 px-4 text-gray-900"
            >
              <option value="business">Business</option>
              <option value="influencer">Influencer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <img src="/assets/mail.svg" alt="Email" width={18} height={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="login-input w-full rounded-lg py-3 pl-10 pr-4 text-gray-900"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              {message}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-reset mb-6 disabled:opacity-60">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <Link to="/login" className="back-link cursor-pointer">
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default Reset;

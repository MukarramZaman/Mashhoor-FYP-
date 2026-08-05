import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Title } from "../../components";
import { authApi } from "../../api/authApi";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid reset link. Request a new one from the login page.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const msg = await authApi.resetPassword(token, password);
      setMessage(msg);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
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
        <div className="text-gray-500 text-lg mt-2">Choose a new password</div>
      </div>

      <div className="login-card rounded-2xl p-8 w-full max-w-120">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="login-input w-full rounded-lg py-3 px-4 text-gray-900"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="login-input w-full rounded-lg py-3 px-4 text-gray-900"
            />
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
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <Link to="/login" className="back-link cursor-pointer">
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default ResetPassword;

import { useEffect, useState } from "react";
import { adminApi } from "../../api/adminApi";

function VerificationDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVerifications = async () => {
    try {
      const data = await adminApi.getPendingVerifications();
      setUsers(data);
      setError("");
    } catch (err: any) {
      setError(err.message || "Failed to load pending verifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await adminApi.verifyUser(id);
      fetchVerifications();
    } catch (err) {
      alert("Failed to verify user");
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm("Are you sure you want to reject and delete this user?")) return;
    try {
      await adminApi.rejectUser(id);
      fetchVerifications();
    } catch (err) {
      alert("Failed to reject user");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading verifications...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">Verification Dashboard</h1>
          <p className="text-gray-500 text-lg">Review and approve new platform users</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-gray-400 py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white">
          No pending verifications. All users are verified!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map((user) => (
            <div key={user._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
              <img 
                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                alt={user.name} 
                className="w-16 h-16 rounded-full object-cover" 
              />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                <p className="text-gray-500 text-sm mb-1">{user.email}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    user.role === 'influencer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-gray-400">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleVerify(user._id)}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium text-sm hover:bg-green-600 transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(user._id)}
                    className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VerificationDashboard;

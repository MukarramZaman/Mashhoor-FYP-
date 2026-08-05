import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { influencerApi } from "../../api/influencerApi";
import { useAuth } from "../../context/AuthContext";

function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [region, setRegion] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);

        if (userData && userData._id) {
          const profileData = await influencerApi.getById(userData._id);
          if (profileData) {
            setBio(profileData.bio || "");
            setNiche(profileData.niche?.[0] || "");
            setRegion(profileData.location || "");
            setInstagram(profileData.platforms?.instagram?.handle || "");
            setYoutube(profileData.platforms?.youtube?.handle || "");
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const existing = await influencerApi.getById(user!._id);
      const updated = await influencerApi.updateMyProfile({
        bio,
        niche: niche ? [niche] : ["Fashion"],
        location: region,
        country: region || "Pakistan",
        platforms: {
          instagram: {
            handle: instagram,
            followers: existing.platforms?.instagram?.followers ?? 0,
            engagementRate: existing.platforms?.instagram?.engagementRate ?? 0,
          },
          youtube: {
            handle: youtube,
            subscribers: existing.platforms?.youtube?.subscribers ?? 0,
            avgViews: existing.platforms?.youtube?.avgViews ?? 0,
            engagementRate: (existing.platforms?.youtube as { engagementRate?: number } | undefined)?.engagementRate ?? 0,
          },
        } as any,
      });
      const profileData = await influencerApi.getById(user!._id);
      setBio(profileData.bio || "");
      setNiche(profileData.niche?.[0] || "");
      setRegion(profileData.location || profileData.country || "");
      setYoutube(profileData.platforms?.youtube?.handle || youtube);
      setMessage(
        updated.youtubeSynced
          ? `Profile updated. YouTube: ${profileData.platforms?.youtube?.subscribers?.toLocaleString() ?? 0} subscribers, trust score ${profileData.trustScore ?? 0}/100.`
          : youtube.trim()
            ? "Profile saved. If YouTube stats are empty, add YOUTUBE_API_KEY on the server or check your channel handle."
            : "Profile updated successfully!"
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const isConfirmed = window.confirm(
      "Are you absolutely sure you want to permanently delete your account? This action cannot be undone."
    );
    if (!isConfirmed) return;

    try {
      await authApi.deleteAccount();
      logout();
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to delete account";
      setError(errMsg);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#f9fafb] min-h-screen p-8 flex justify-center items-center">
        <p className="text-gray-500 animate-pulse">Loading settings...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#f9fafb] min-h-screen p-8">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-500 mt-1">
            Update your influencer profile information
          </p>
        </div>

        {message && (
          <div className="max-w-4xl mx-auto mb-6 bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 font-medium">
            {message}
          </div>
        )}
        
        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium">
            {error}
          </div>
        )}

        <div className="bg-white max-w-4xl mx-auto border border-gray-200 rounded-xl p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            Basic Information
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={user?.name || ""}
                disabled
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell brands about yourself..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500 transition-colors"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Niche
              </label>
              <div className="relative">
                <select 
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 appearance-none focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Niche</option>
                  <option value="Politics">Politics</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Cricket">Cricket</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Tech">Tech</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <div className="relative">
                <select 
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 appearance-none focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Region</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="UAE">UAE</option>
                  <option value="USA">USA</option>
                  <option value="UK">UK</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="bg-white max-w-4xl mx-auto border border-gray-200 rounded-xl p-8 mb-8 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-6">
            Social Media Links
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instagram
              </label>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube
              </label>
              <input
                type="text"
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                placeholder="Channel URL or @handle"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="danger-card max-w-4xl mx-auto mb-8">
          <h2 className="danger-text">Danger Zone</h2>

          <button onClick={handleDeleteAccount} className="btn-danger-outline">
            Delete Account Permanently
          </button>
        </div>

        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#6d28d9] hover:bg-purple-700 text-white font-medium text-lg py-4 rounded-xl shadow-lg shadow-purple-200 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              <>
                <img src="/assets/save.svg" alt="Save" width={20} height={20} />
                Save Changes
              </>
            )}
          </button>

          <button 
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium text-lg py-4 rounded-xl transition-all flex justify-center items-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </>
  );
}

export default Settings;

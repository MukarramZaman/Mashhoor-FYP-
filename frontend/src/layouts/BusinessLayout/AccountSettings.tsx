import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api";
import { useNavigate } from "react-router-dom";

function AccountSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [toggles, setToggles] = useState({
    campaigns: true,
    messages: true,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      const parts = user.name.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const updatedUser = await authApi.updateProfile({
        name: fullName,
        email,
        phone,
      });
      updateUser(updatedUser);
      showToast("Profile updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await authApi.updatePassword(currentPassword, newPassword);
      showToast("Password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to update password";
      showToast(errMsg, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
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
      showToast(errMsg, "error");
    }
  };

  return (
    <div className="account-bg">
      <div className="p-8">
        <div className="max-w-4xl mx-auto mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your account preferences and security
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="settings-section-card">
            <h2 className="section-title">Profile Information</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="settings-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="settings-input"
                />
              </div>
              <div>
                <label className="settings-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="settings-input"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="settings-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="settings-input"
              />
            </div>

            <div>
              <label className="settings-label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="settings-input"
                placeholder="+92 333 1234567"
              />
            </div>
          </div>

          <div className="settings-section-card">
            <h2 className="section-title">
              <img
                src="/assets/lock.svg"
                alt="Security"
                width={20}
                height={20}
              />
              Password & Security
            </h2>

            <div className="mb-6">
              <label className="settings-label">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="settings-input"
              />
            </div>

            <div className="mb-6">
              <label className="settings-label">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="settings-input"
              />
            </div>

            <div className="mb-6">
              <label className="settings-label">Confirm New Password</label>
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="settings-input"
              />
            </div>

            <button 
              onClick={handleUpdatePassword} 
              disabled={isUpdatingPassword}
              className="btn-update-pass"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>

          <div className="settings-section-card">
            <h2 className="section-title">
              <img
                src="/assets/bell.svg"
                alt="Notifications"
                width={20}
                height={20}
              />
              Notification Preferences
            </h2>

            <div className="toggle-row">
              <div>
                <div className="font-medium text-gray-900">
                  Campaign Updates
                </div>
                <div className="text-sm text-gray-500">
                  Get notified about campaign activities
                </div>
              </div>
              <div
                className={`toggle-switch ${toggles.campaigns ? "active" : ""}`}
                onClick={() => handleToggle("campaigns")}
              >
                <div className="toggle-circle"></div>
              </div>
            </div>

            <div className="toggle-row">
              <div>
                <div className="font-medium text-gray-900">Messages</div>
                <div className="text-sm text-gray-500">
                  Get notified when you receive messages
                </div>
              </div>
              <div
                className={`toggle-switch ${toggles.messages ? "active" : ""}`}
                onClick={() => handleToggle("messages")}
              >
                <div className="toggle-circle"></div>
              </div>
            </div>
          </div>

          <div className="danger-card">
            <h2 className="danger-text">Danger Zone</h2>

            <button onClick={handleDeleteAccount} className="btn-danger-outline">
              Delete Account Permanently
            </button>
          </div>

          <div className="flex flex-col gap-4 mt-8">
            <button className="btn-save-primary" onClick={handleSave} disabled={isSaving}>
              <img src="/assets/save.svg" alt="Save" width={20} height={20} />
              {isSaving ? "Saving..." : "Save All Changes"}
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors border border-red-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-300 ${toast.type === "success" ? "bg-gray-900 text-green-400" : "bg-red-600 text-white"
          }`}>
          {toast.type === "success" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium text-sm text-white">{toast.text}</span>
        </div>
      )}
    </div>
  );
}

export default AccountSettings;

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import userApiClient from "../../../../api/userApiClient";

export const ResetPasswordView = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or missing a token.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      // Backend expects snake_case new_password (see passwordReset.controller.js)
      await userApiClient.post("/auth/password-reset/reset", { token, new_password: newPassword });
      setDone(true);
      setTimeout(() => navigate("/", { replace: true }), 2500);
    } catch (err: any) {
      const backendErrors = err.response?.data?.errors;
      setError(
        backendErrors?.[0]?.message || err.response?.data?.message || "Failed to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">Invalid link</h2>
        <p className="text-gray-500 text-sm">
          This password reset link is missing or malformed. Please request a new one.
        </p>
        <Link to="/forgot-password" className="inline-block text-sm font-semibold text-black underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold text-black">Password updated</h2>
        <p className="text-gray-500 text-sm">
          You've been signed out of all devices for security. Redirecting you to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-black">Set a new password</h2>
        <p className="text-gray-500 mt-2">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-full border bg-blue-50"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-full border bg-blue-50"
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-black text-white font-semibold"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </div>
  );
};
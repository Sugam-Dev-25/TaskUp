import { useState } from "react";
import { Link } from "react-router-dom";
import userApiClient from "../../../../api/userApiClient";

export const ForgotPasswordView = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await userApiClient.post("/auth/password-reset/forgot", { email });
      // Backend always returns the same success message whether or not the
      // email exists (anti-enumeration) — so we always show this screen.
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-md  space-y-4">
        <h2 className="text-2xl font-bold text-black">Check your email</h2>
        <p className="text-gray-500 text-sm">
          If an account exists for <span className="font-medium text-black">{email}</span>, we've sent
          instructions to reset your password.
        </p>
        <Link to="/" className="inline-block text-sm font-semibold text-black hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-black">Reset your password</h2>
        <p className="text-gray-500 mt-2">
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-6 py-4 rounded-full border bg-blue-50"
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-full bg-black text-white font-semibold"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <Link to="/" className="block text-right text-sm text-gray-700 hover:text-black hover:underline pr-4">
          Back to sign in
        </Link>
      </form>
    </div>
  );
};
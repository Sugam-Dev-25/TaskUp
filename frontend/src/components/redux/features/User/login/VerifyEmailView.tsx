import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import userApiClient from "../../../../api/userApiClient";

export const VerifyEmailView = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) return setStatus("error");
    userApiClient
      .get("/auth/verify-email", { params: { token } })
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="w-full max-w-md text-center space-y-4">
      {status === "loading" && <p className="text-gray-500">Verifying your email...</p>}
      {status === "ok" && (
        <>
          <h2 className="text-2xl font-bold text-black">Email verified</h2>
          <p className="text-gray-500 text-sm">Your account is ready. You can sign in now.</p>
          <Link to="/" className="inline-block text-sm font-semibold underline">Go to sign in</Link>
        </>
      )}
      {status === "error" && (
        <>
          <h2 className="text-2xl font-bold text-black">Link invalid or expired</h2>
          <p className="text-gray-500 text-sm">Ask your manager to resend the verification email.</p>
        </>
      )}
    </div>
  );
};
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hook";
import { loginUsers } from "./loginSlice";
import { slugify } from "../../../../hooks/slugify";
 
interface LoginForm {
  email: string;
  password: string;
}
 
export const LoginView = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
 
  const { loading, error, user } = useAppSelector(
    (state) => state.login
  );
 
  const { register, handleSubmit } = useForm<LoginForm>();
 
  const submitLogin = (data: LoginForm) => {
    dispatch(loginUsers(data));
  };
 const role=user?.role ? slugify(user.role) : ""
  // ✅ ROLE BASED REDIRECT
  useEffect(() => {
    if (role) {
      navigate(`/${role}/dashboard`, { replace: true });
    }
  }, [user, navigate]);
 
  return (
    <div className="w-full">
      {/* HEADING */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-black">
          Sign in to Your Account
        </h2>
        <p className="text-gray-500 mt-2">
          Please sign in to access your dashboard
        </p>
      </div>
 
      {/* FORM */}
      <form onSubmit={handleSubmit(submitLogin)} className="space-y-6">
        <input
          type="email"
          placeholder="Email address"
          {...register("email", { required: true })}
          className="w-full px-6 py-4 rounded-full border bg-blue-50"
        />
 
        <input
          type="password"
          placeholder="Password"
          {...register("password", { required: true })}
          className="w-full px-6 py-4 rounded-full border bg-blue-50"
        />
 
        {error && (
          <p className="text-red-500 text-sm text-center">
            {error}
          </p>
        )}
 
        <button
          type="submit"
          disabled={loading === "pending"}
          className="w-full py-4 rounded-full bg-black text-white font-semibold"
        >
          {loading === "pending" ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
};
 
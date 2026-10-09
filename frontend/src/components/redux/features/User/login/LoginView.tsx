import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hook";
import { loginUsers } from "./loginSlice";
import { slugify } from "../../../../hooks/slugify";
import { useToast } from "../../../../hooks/useToast";
import { PasswordInput } from "../../../../modal/PasswordInput";

interface LoginForm {
  email: string;
  password: string;
}

export const LoginView = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const showToast=useToast()
  const { loading, error, user } = useAppSelector(
    (state) => state.login
  );

  const { register, handleSubmit } = useForm<LoginForm>();

  const submitLogin = (data: LoginForm) => {
    dispatch(loginUsers(data));
  };
  const role = user?.role ? slugify(user.role) : ""
  // ✅ ROLE BASED REDIRECT
  useEffect(() => {
    if (role) {
      navigate(`/${role}/dashboard`, { replace: true });
      showToast("Login Successful")
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

        <PasswordInput
  placeholder="Password"
  name="password"
  register={register}
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
      <Link to="/forgot-password" className="block text-right text-sm text-gray-500 hover:underline hover:text-black mt-6 pr-4">
        Forgot password?
      </Link>
    </div>
  );
};

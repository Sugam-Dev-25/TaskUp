import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../../app/hook";
import { registerUser } from "./registerSlice";

const ROLES = [
  "super-admin",
  "admin",
  "Designer",
  "Developer",
  "Quality Testing",
  "Bussiness Analyst",
];

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
}

export const RegisterView = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.register);

  const { register, handleSubmit, reset } = useForm<RegisterForm>();

  const submitHandler = (data: RegisterForm) => {
    dispatch(registerUser(data)).then(() => reset());
  };

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      className="space-y-6"
    >
      <input
        placeholder="Full Name"
        {...register("name", { required: true })}
        className="
          w-full
          px-6
          py-4
          border
          border-gray-300
          rounded-full
          focus:outline-none
          focus:border-black
        "
      />

      <input
        type="email"
        placeholder="Email address"
        {...register("email", { required: true })}
        className="
          w-full
          px-6
          py-4
          border
          border-gray-300
          rounded-full
          focus:outline-none
          focus:border-black
        "
      />

      <input
        type="password"
        placeholder="Password"
        {...register("password", { required: true })}
        className="
          w-full
          px-6
          py-4
          border
          border-gray-300
          rounded-full
          focus:outline-none
          focus:border-black
        "
      />

      <select
        {...register("role", { required: true })}
        className="
          w-full
          px-6
          py-4
          border
          border-gray-300
          rounded-full
          bg-white
          focus:outline-none
          focus:border-black
        "
      >
        <option value="">Select Role</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <input
        placeholder="Phone (optional)"
        {...register("phone")}
        className="
          w-full
          px-6
          py-4
          border
          border-gray-300
          rounded-full
          focus:outline-none
          focus:border-black
        "
      />

      {error && (
        <p className="text-red-500 text-sm text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading === "pending"}
        className="
          w-full
          py-4
          rounded-full
          bg-black
          text-white
          font-semibold
          hover:bg-neutral-900
          transition
        "
      >
        {loading === "pending" ? "Creating user..." : "Create User"}
      </button>
    </form>
  );
};



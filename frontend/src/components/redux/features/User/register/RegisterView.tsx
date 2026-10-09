import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../../app/hook";
import { registerUser } from "./registerSlice";
import { CaretDownIcon } from "@phosphor-icons/react";
import { PasswordInput } from "../../../../modal/PasswordInput";

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  role: string;

}

export const RegisterView = () => {
  const dispatch = useAppDispatch();
  const { loading, error, successMessage } = useAppSelector((state) => state.register);

  const { register, handleSubmit, reset } = useForm<RegisterForm>();
  const currentUser = useAppSelector((s) => s.login.user);
  const ROLES = currentUser?.role === "ceo"
    ? [{ value: "employee", label: "Employee" }, { value: "hr", label: "HR" }, { value: "manager", label: "Manager" }]
    : [{ value: "employee", label: "Employee" }, { value: "hr", label: "HR" }];
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
        {...register("fullName", { required: true })}
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

      <PasswordInput
        placeholder="Password"
        name="password"
        register={register}
      />

      <div className="relative w-full group">
        <select
          {...register("role", { required: true })}
          className="
         w-full appearance-none px-6 py-4 pr-12 rounded-full border border-gray-300 bg-white text-gray-700 outline-none transition-all duration-200 cursor-pointer 
        "
        >
          <option value="">Select Role</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <CaretDownIcon
          size={20}
          weight="bold"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-transform duration-200 group-focus-within:rotate-180"
        />
      </div>



      {error && (
        <p className="text-red-500 text-sm text-center">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="text-emerald-600 text-sm text-center">
          {successMessage} They'll need to verify their email before signing in.
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



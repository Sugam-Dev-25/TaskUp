import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hook";
import { useForm } from "react-hook-form";
import { createBoard } from "./boardSlice";
import { X } from "@phosphor-icons/react";
import UserSearchInput from "../../../dashboard/UserSearchInput";

interface BoardFormInputs {
  full_name: string;
}

interface CreateBoardFormProps {
  onClose: () => void;
}

export const CreateBoardForm = ({ onClose }: CreateBoardFormProps) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.board);
  const isPending = loading === "pending";

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BoardFormInputs>();

  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);

  const handleAddMember = (user: { id: string; full_name: string }) => {
    if (!members.find((m) => m.id === user.id)) {
      setMembers((prev) => [...prev, user]);
    }
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const onSubmit = (data: BoardFormInputs) => {
    if (members.length === 0) return;

    dispatch(
      createBoard({
        name: data.full_name,
        members: members.map((m) => m.id),
      })
    ).then((res) => {
      if (createBoard.fulfilled.match(res)) {
        reset();
        setMembers([]);
        onClose();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="relative text-center">
        <h2 className="text-2xl font-bold text-black">Create Project</h2>
        <p className="text-sm text-gray-500 mt-1">
          Organize work and invite team members
        </p>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="
            absolute top-0 right-0
            h-8 w-8
            bg-black rounded-full
            flex items-center justify-center
            hover:bg-gray-800 transition
          "
        >
          <X size={16} className="text-white" />
        </button>
      </div>

      {/* ================= BOARD NAME ================= */}
      <div>
        <input
          {...register("full_name", { required: "Board name is required" })}
          placeholder="Enter project name"
          className="
            w-full h-12 px-5 rounded-full
            border border-gray-300
            focus:ring-2 focus:ring-black
            outline-none
          "
        />
        {errors.full_name && (
          <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
        )}
      </div>

      {/* ================= MEMBERS ================= */}
      <UserSearchInput
        onUserSelect={handleAddMember}
        excludeUserIds={members.map((m) => m.id)}
      />

      {/* ================= SELECTED MEMBERS ================= */}
      {members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span
              key={m.id}
              onClick={() => handleRemoveMember(m.id)}
              className="
                flex items-center gap-2
                px-4 py-1 text-xs
                bg-gray-200 rounded-full
                cursor-pointer
                hover:bg-black hover:text-white
                transition
              "
            >
              {m.full_name}
              <X size={12} />
            </span>
          ))}
        </div>
      )}

      {/* ================= ERROR ================= */}
      {error && (
        <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
      )}

      {/* ================= SUBMIT ================= */}
      <button
        type="submit"
        disabled={isPending || members.length === 0}
        className="
    w-full h-12 rounded-full
    bg-black text-white font-semibold
    hover:bg-gray-900 transition
    disabled:opacity-100
    disabled:bg-black
    disabled:text-white
    cursor-pointer
    disabled:cursor-not-allowed
  "
      >
        {isPending ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
};

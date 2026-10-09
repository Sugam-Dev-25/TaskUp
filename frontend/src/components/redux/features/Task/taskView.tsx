import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../app/hook";
import { addTask } from "./taskSlice";
import type { Task } from "../../../types/board.Types";
import UserSearchInput from "../../../dashboard/UserSearchInput";
import { CaretDownIcon, X } from "@phosphor-icons/react";
import { useToast } from "../../../hooks/useToast";

interface Props {
  boardId: string;
  columnId: string;
  onClose: () => void;   // ✅ only this added
}

const TaskView: React.FC<Props> = ({ boardId, columnId, onClose }) => {
  const [editedTask, setEditedTask] = useState<Partial<Task>>({
    assignedTo: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false)

  const dispatch = useAppDispatch();
  const boards = useAppSelector((state) => state.board.boards);
  const currentBoard = boards.find((b) => b.id === boardId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Task>();

  const showToast=useToast()

  const onSubmit = (data: Task) => {
    setIsSubmitting(true)
    dispatch(
      addTask({
        boardId,
        columnId,
        taskData: {
          ...data,
          assignedTo: Array.isArray(editedTask.assignedTo)
            ? editedTask.assignedTo.map((u: any) => u.id)
            : [],
          start_date: data.start_date ? new Date(data.start_date) : undefined,
          due_date: data.due_date ? new Date(data.due_date) : undefined,
        },
      })
    )
      .unwrap()
      .then(() => {
        reset();
        setEditedTask({ assignedTo: [] });
        showToast("Task Cretaed")
        onClose(); // ✅ close after submit
        
      })
      .catch(() => setIsSubmitting(false))
  };

  const handleChange = (field: keyof Task, value: any) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  const today = new Date().toISOString().split("T")[0]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
      onClick={onClose} // ✅ outside click close
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-8 relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}   // ✅ FIXED
          className="absolute top-4 right-4 bg-black text-white rounded-full w-8 h-8 flex items-center justify-center"
        >
          <X size={16} />
        </button>

        <h2 className="text-2xl font-bold text-center">
          Create Task
        </h2>
        <p className="text-gray-500 text-center text-sm mb-6">
          Add a new task to your board
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <input
            {...register("title", {
              required: "Title is required",
            })}
            placeholder="Task Title"
            className="w-full px-5 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          {errors.title && (
            <p className="text-red-500 text-sm">
              {errors.title.message}
            </p>
          )}

          <textarea
            {...register("description")}
            placeholder="Description"
            className="w-full px-5 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          <div className="flex gap-3">
            <input
              type="date"
              min={today}
              defaultValue={today}
              {...register("start_date", { required: "Start Date is required" })}
              className="w-full px-4 py-3 rounded-full border border-gray-300"
            />
            <input
              type="date"
              min={today}
              defaultValue={today}
              {...register("due_date", { required: "Due date is required" })}
              className="w-full px-4 py-3 rounded-full border border-gray-300"
            />
          </div>

          <div className="relative w-full group">
            <select
              {...register("priority", { required: true })}
              className="w-full appearance-none px-5 py-3 pr-12 rounded-full border border-gray-300 bg-white text-gray-700 outline-none transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Select Priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <CaretDownIcon
              size={20}
              weight="bold"
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none transition-transform duration-200 group-focus-within:rotate-180"
            />
          </div>

          <div className="space-y-3">
            <UserSearchInput
              onUserSelect={(selectedUser) => {
                const current = Array.isArray(
                  editedTask.assignedTo
                )
                  ? editedTask.assignedTo
                  : [];
                if (
                  !current.some(
                    (u) => u.id === selectedUser.id
                  )
                ) {
                  handleChange(
                    "assignedTo",
                    [...current, selectedUser]
                  );
                }
              }}
              excludeUserIds={
                Array.isArray(editedTask.assignedTo)
                  ? editedTask.assignedTo.map(
                    (u) => u.id
                  )
                  : []
              }
              includeUserIds={
                currentBoard?.members.map(
                  (m: any) => m.id
                ) || []
              }
            />

            <div className="flex flex-wrap gap-2">
              {Array.isArray(
                editedTask.assignedTo
              ) &&
                editedTask.assignedTo.map(
                  (u: any) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold">
                        {u.full_name
                          ?.trim()[0]
                          ?.toUpperCase()}
                      </div>

                      {u.full_name}

                      <button
                        type="button"
                        onClick={() => {
                          const filtered =
                            editedTask.assignedTo?.filter(
                              (user: any) =>
                                user.id !== u.id
                            );
                          handleChange(
                            "assignedTo",
                            filtered
                          );
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                )}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full bg-black text-white py-4 rounded-full font-semibold text-lg hover:opacity-90 transition"
          >
            {isSubmitting? "Creating...": "Cretate task"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskView;


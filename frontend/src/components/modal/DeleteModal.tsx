import { Warning } from "@phosphor-icons/react";


interface DeleteBoardModalProps<T> {
  item: T | null;
  getName:(item: T)=>string;
  getId:(item: T)=>string;
  itemLabel?:string;
  message?:string;
  onCancel: () => void;
  onConfirm: (id: string, item: T) => void;
}

export const DeleteModal = <T, >({ item, getName, getId, itemLabel="item", message, onCancel, onConfirm }: DeleteBoardModalProps<T>) => {
  if (!item) return null;
  const name=getName(item);
  const id=getId(item);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-xl p-6 w-96 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Warning
            size={24}
            weight="fill"
            className="text-red-600"
            />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          Confirm Delete
        </h2>

        <p className="text-sm text-gray-600 mb-6">
          {message || (
            <>
              Are you sure you want to delete this {itemLabel}{" "}
          <span className="font-semibold text-red-600">
            {name}
          </span>
          ?
            </>
          )}
          
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(id, item)}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
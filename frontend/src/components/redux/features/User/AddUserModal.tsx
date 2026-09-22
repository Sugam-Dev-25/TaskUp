import {RegisterView} from "./register/RegisterView";
import { X } from "@phosphor-icons/react";

const AddUserModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="
          relative
          w-[520px]
          bg-white
          rounded-2xl
          shadow-2xl
          px-8
          py-10
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 bg-black text-white rounded-full p-1"
        >
          <X size={16} />
        </button>

        {/* Heading */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-black">
            Create User
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Create an account and assign role
          </p>
        </div>

        {/* Form */}
        <RegisterView />
      </div>
    </div>
  );
};

export default AddUserModal;

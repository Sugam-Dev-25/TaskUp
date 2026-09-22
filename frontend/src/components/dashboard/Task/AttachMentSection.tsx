import React, { useRef } from 'react';
import { Paperclip, CloudArrowUp, Trash, ArrowSquareOut } from "@phosphor-icons/react";
import { useDispatch } from 'react-redux';
import type { Attachment } from '../../types/allType';
import type { AppDispatch } from '../../redux/app/store';
import { deleteFiles, uploadFiles } from '../../redux/features/Task/taskSlice';
// import { deleteFile } from '../../redux/features/Task/taskSlice'; 

interface AttachmentSectionProps {
    taskId: string;
    attachments: Attachment[];
}

export const AttachmentSection = ({ taskId, attachments }: AttachmentSectionProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append("files", file); 
        });

        dispatch(uploadFiles({ taskId, formData }));
        
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = (fileId: string) => {
        if (window.confirm("Are you sure you want to delete this attachment?")) {
            dispatch(deleteFiles({ taskId, fileId }));
            console.log("Delete file ID:", fileId, "from task:", taskId);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Title and Count */}
            <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip size={18} weight="bold" /> Attachments
                </h3>
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {attachments?.length || 0} {attachments?.length === 1 ? 'File' : 'Files'}
                </span>
            </div>

            {/* Upload Area */}
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/50 group hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    multiple 
                />
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                    <CloudArrowUp size={22} className="text-blue-500" />
                </div>
                <p className="text-xs text-gray-400 font-medium">
                    Drop files or <span className="text-blue-500 font-bold underline">browse</span>
                </p>
            </div>

            {/* File List */}
            <div className="space-y-2">
                {attachments?.map((file) => (
                    <div key={file._id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 group hover:border-blue-100 hover:shadow-sm transition-all">
                        <div className="w-8 h-8 flex-shrink-0 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                            <Paperclip size={16} />
                        </div>
                        
                        <div className="flex-grow min-w-0">
                            <p className="text-xs font-bold text-gray-700 truncate lowercase">{file.fileName}</p>
                            <p className="text-[10px] text-gray-400">By {file.uploadedBy?.name || 'Unknown'}</p>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                                href={file.fileUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Open file"
                            >
                                <ArrowSquareOut size={16} weight="bold" />
                            </a>
                            <button 
                                onClick={() => handleDelete(file._id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete file"
                            >
                                <Trash size={16} weight="bold" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Footer Summary */}
            {attachments?.length > 0 && (
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.15em]">
                    Total storage: {attachments.length} items attached
                </p>
            )}
        </div>
    );
};
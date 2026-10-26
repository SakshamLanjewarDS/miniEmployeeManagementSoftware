"use client";

import React from "react";
import { MessageSquare, X } from "lucide-react";

export interface ReplyModalState {
  clarificationId: string;
  checklistItemId?: string;
  question: string;
}

interface TaskClarificationModalProps {
  modal: ReplyModalState | null;
  replyMessageInput: string;
  submittingReply: boolean;
  onClose: () => void;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const TaskClarificationModal = React.memo(function TaskClarificationModal({
  modal,
  replyMessageInput,
  submittingReply,
  onClose,
  onInputChange,
  onSubmit,
}: TaskClarificationModalProps) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E6F0] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E6F0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5A81FA] text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1F1F1F]">Reply to Clarification</h3>
              <p className="text-xs text-[#696E82]">Provide guidance to assigned staff</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#696E82] hover:text-[#1F1F1F] p-1 rounded-lg hover:bg-[#F2F4FF] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-[#F8F9FD] border border-[#E2E6F0] rounded-xl text-xs space-y-1">
          <span className="font-bold text-[#696E82] block">Question:</span>
          <p className="text-[#1F1F1F] leading-relaxed">{modal.question}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#1F1F1F] mb-1">
              Your Answer / Clarification <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={replyMessageInput}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Provide clarification, link approved drawing revision, or confirm specification..."
              className="w-full p-2.5 bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-[#5A81FA]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F2F4FF] text-[#696E82] font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReply || !replyMessageInput.trim()}
              className="px-5 py-2 bg-[#5A81FA] hover:bg-[#426EE8] text-white font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submittingReply ? "Posting..." : "Post Answer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

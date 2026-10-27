"use client";

import React from "react";
import { ListTodo, Calendar, StickyNote, X } from "lucide-react";

interface LeadershipCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  createTodoTab: "TASK" | "MEETING" | "NOTE";
  setCreateTodoTab: (tab: "TASK" | "MEETING" | "NOTE") => void;
  createTodoForm: any;
  setCreateTodoForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateExecutiveTask: (e: React.FormEvent) => void;
  handleCreateMeeting: (e: React.FormEvent) => void;
  handleCreateNote: (e: React.FormEvent) => void;
  teamMembers: any[];
  projects: any[];
  actionLoading: boolean;
}

export function LeadershipCreateModal({
  isOpen,
  onClose,
  createTodoTab,
  setCreateTodoTab,
  createTodoForm,
  setCreateTodoForm,
  handleCreateExecutiveTask,
  handleCreateMeeting,
  handleCreateNote,
  teamMembers,
  projects,
  actionLoading,
}: LeadershipCreateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-todo-modal-title"
        className="bg-white rounded-2xl sm:rounded-3xl border border-[#E2E6F0] shadow-xl w-full max-w-lg overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E2E6F0]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#3562E8]/10 text-[#3562E8] flex items-center justify-center font-bold">
              {createTodoTab === "TASK" ? (
                <ListTodo className="w-4 h-4" />
              ) : createTodoTab === "MEETING" ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <StickyNote className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 id="create-todo-modal-title" className="type-card-title text-[#0B122B]">
                {createTodoTab === "TASK"
                  ? "Create To-Do / Task"
                  : createTodoTab === "MEETING"
                  ? "Schedule Studio Meeting"
                  : "Add Leadership Note"}
              </h3>
              <p className="text-xs text-[#696E82]">
                {createTodoTab === "TASK"
                  ? "Assign to yourself or delegate to any team member"
                  : createTodoTab === "MEETING"
                  ? "Schedule an internal review or client sync"
                  : "Quick strategic reminder or meeting notes"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F8F9FE] text-[#696E82] cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#E2E6F0] bg-[#F8F9FE] px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCreateTodoTab("TASK")}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              createTodoTab === "TASK"
                ? "border-[#3562E8] text-[#3562E8]"
                : "border-transparent text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            To-Do / Task
          </button>
          <button
            type="button"
            onClick={() => setCreateTodoTab("MEETING")}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              createTodoTab === "MEETING"
                ? "border-[#3562E8] text-[#3562E8]"
                : "border-transparent text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            Meeting
          </button>
          <button
            type="button"
            onClick={() => setCreateTodoTab("NOTE")}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              createTodoTab === "NOTE"
                ? "border-[#3562E8] text-[#3562E8]"
                : "border-transparent text-[#696E82] hover:text-[#0B122B]"
            }`}
          >
            Note
          </button>
        </div>

        {createTodoTab === "TASK" && (
          <form onSubmit={handleCreateExecutiveTask} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Review structural calculations for Tower B"
                value={createTodoForm.title}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">
                  Assign To <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createTodoForm.assigneeMembershipId}
                  onChange={(e) =>
                    setCreateTodoForm({ ...createTodoForm, assigneeMembershipId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                >
                  <option value="myself">Myself (Personal To-Do)</option>
                  <optgroup label="Assign to Team Member">
                    {(teamMembers || []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} {m.designation ? `(${m.designation})` : `(${m.role})`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">Priority</label>
                <select
                  value={createTodoForm.priority}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, priority: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">Due Date</label>
                <input
                  type="date"
                  value={createTodoForm.dueDate}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Operations, Design, Client"
                  value={createTodoForm.category}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                />
              </div>
            </div>

            {projects && projects.length > 0 && (
              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">
                  Related Project (Optional)
                </label>
                <select
                  value={createTodoForm.projectId}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                >
                  <option value="">No Project Linked</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">Notes / Description</label>
              <textarea
                rows={3}
                placeholder="Provide details or checklist context..."
                value={createTodoForm.description}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] font-bold hover:bg-[#F8F9FE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Create & Assign"}
              </button>
            </div>
          </form>
        )}

        {createTodoTab === "MEETING" && (
          <form onSubmit={handleCreateMeeting} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">
                Meeting Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Client Design Progress Review"
                value={createTodoForm.title}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createTodoForm.meetingDate}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, meetingDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">
                  Start Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={createTodoForm.startTime}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">
                  End Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={createTodoForm.endTime}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#0B122B] mb-1">Meeting Type</label>
                <select
                  value={createTodoForm.meetingType}
                  onChange={(e) => setCreateTodoForm({ ...createTodoForm, meetingType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                >
                  <option value="INTERNAL_DESIGN_REVIEW">Internal Design Review</option>
                  <option value="CLIENT_UPDATE">Client Update</option>
                  <option value="SITE_COORDINATION">Site Coordination</option>
                  <option value="CONSULTANT_SYNC">Consultant Sync</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              {projects && projects.length > 0 && (
                <div>
                  <label className="block font-semibold text-[#0B122B] mb-1">Related Project</label>
                  <select
                    value={createTodoForm.projectId}
                    onChange={(e) => setCreateTodoForm({ ...createTodoForm, projectId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs font-medium text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
                  >
                    <option value="">No Project</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">Agenda / Minutes</label>
              <textarea
                rows={3}
                placeholder="Key discussion topics or expectations..."
                value={createTodoForm.agenda}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, agenda: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] font-bold hover:bg-[#F8F9FE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Scheduling..." : "Schedule Meeting"}
              </button>
            </div>
          </form>
        )}

        {createTodoTab === "NOTE" && (
          <form onSubmit={handleCreateNote} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">
                Note Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Call contractor about concrete delivery delay"
                value={createTodoForm.title}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">Tag / Category</label>
              <input
                type="text"
                placeholder="e.g. Strategy, Follow-up, Site, Client"
                value={createTodoForm.noteTag}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, noteTag: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#0B122B] mb-1">Content</label>
              <textarea
                rows={4}
                placeholder="Write your note or thoughts here..."
                value={createTodoForm.description}
                onChange={(e) => setCreateTodoForm({ ...createTodoForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[#E2E6F0] bg-white text-xs text-[#0B122B] focus:outline-none focus:border-[#3562E8] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E2E6F0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E2E6F0] text-[#696E82] font-bold hover:bg-[#F8F9FE] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ListTodo,
  Plus,
  Calendar,
  StickyNote,
  Search,
  Check,
  Tag,
  Clock,
  ExternalLink,
  Copy,
  Trash2,
  Users,
} from "lucide-react";
import { AdvancedPagination, usePagination } from "@/components/ui/AdvancedPagination";

interface LeadershipTodoHubProps {
  workspaceSlug: string;
  executiveTasks: any[];
  executiveMeetings: any[];
  leadershipNotes: any[];
  filteredExecutiveTasks: any[];
  filteredMeetings: any[];
  filteredNotes: any[];
  todoFilterType: "ALL" | "PERSONAL" | "DELEGATED" | "MEETING" | "NOTE";
  setTodoFilterType: (val: "ALL" | "PERSONAL" | "DELEGATED" | "MEETING" | "NOTE") => void;
  todoFilterStatus: "ALL" | "PENDING" | "DONE";
  setTodoFilterStatus: (val: "ALL" | "PENDING" | "DONE") => void;
  todoFilterPriority: "ALL" | "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  setTodoFilterPriority: (val: "ALL" | "URGENT" | "HIGH" | "MEDIUM" | "LOW") => void;
  todoSearch: string;
  setTodoSearch: (val: string) => void;
  isTaskPersonal: (task: any) => boolean;
  handleToggleExecutiveTaskStatus: (task: any) => void;
  handleDeleteNote: (id: string) => void;
  onOpenCreate: (tab: "TASK" | "MEETING" | "NOTE") => void;
  personalTasksCount: number;
  delegatedTasksCount: number;
  onCopyNote: (text: string) => void;
}

export function LeadershipTodoHub({
  workspaceSlug,
  executiveTasks,
  executiveMeetings,
  leadershipNotes,
  filteredExecutiveTasks,
  filteredMeetings,
  filteredNotes,
  todoFilterType,
  setTodoFilterType,
  todoFilterStatus,
  setTodoFilterStatus,
  todoFilterPriority,
  setTodoFilterPriority,
  todoSearch,
  setTodoSearch,
  isTaskPersonal,
  handleToggleExecutiveTaskStatus,
  handleDeleteNote,
  onOpenCreate,
  personalTasksCount,
  delegatedTasksCount,
  onCopyNote,
}: LeadershipTodoHubProps) {
  const router = useRouter();

  const combinedItems = React.useMemo(() => {
    const list: Array<
      | { kind: "TASK"; data: any }
      | { kind: "MEETING"; data: any }
      | { kind: "NOTE"; data: any }
    > = [];
    filteredExecutiveTasks.forEach((t) => list.push({ kind: "TASK", data: t }));
    filteredMeetings.forEach((m) => list.push({ kind: "MEETING", data: m }));
    filteredNotes.forEach((n) => list.push({ kind: "NOTE", data: n }));
    return list;
  }, [filteredExecutiveTasks, filteredMeetings, filteredNotes]);

  const { paginatedItems, paginationProps } = usePagination(combinedItems, {
    initialPageSize: 10,
    itemName: "items",
  });

  return (
    <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6F0] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#3562E8]" />
            <h2 className="type-card-title text-[#0B122B]">Leadership To-Do & Dispatch Hub</h2>
          </div>
          <p className="text-xs text-[#696E82] mt-1">
            Personal to-dos, delegated deliverables, scheduled meetings and leadership notes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onOpenCreate("TASK")}
            className="px-3.5 py-2 rounded-xl bg-[#3562E8] hover:bg-[#284ebd] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task / To-Do</span>
          </button>

          <button
            onClick={() => onOpenCreate("MEETING")}
            className="px-3.5 py-2 rounded-xl bg-[#0B122B] hover:bg-[#1C2645] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Meeting</span>
          </button>

          <button
            onClick={() => onOpenCreate("NOTE")}
            className="px-3.5 py-2 rounded-xl border border-[#E2E6F0] bg-white hover:bg-[#F8F9FE] text-[#0B122B] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Note</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Type Pills, Status Dropdown, Priority Dropdown, Search */}
      <div className="space-y-3">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            {
              key: "ALL",
              label: "All Items",
              count: executiveTasks.length + executiveMeetings.length + leadershipNotes.length,
            },
            { key: "PERSONAL", label: "Personal To-Dos", count: personalTasksCount },
            { key: "DELEGATED", label: "Assigned to Team", count: delegatedTasksCount },
            { key: "MEETING", label: "Meetings", count: executiveMeetings.length },
            { key: "NOTE", label: "Notes", count: leadershipNotes.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTodoFilterType(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                todoFilterType === tab.key
                  ? "bg-[#3562E8] text-white shadow-2xs"
                  : "bg-[#F8F9FE] text-[#696E82] hover:text-[#0B122B] hover:bg-slate-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  todoFilterType === tab.key ? "bg-white/20 text-white" : "bg-slate-200/60 text-[#696E82]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Advanced Filters: Status, Priority, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#696E82] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search items or assignees..."
              value={todoSearch}
              onChange={(e) => setTodoSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs text-[#0B122B] placeholder:text-[#696E82]/70 focus:outline-none focus:border-[#3562E8] transition-colors"
            />
          </div>

          <select
            value={todoFilterStatus}
            onChange={(e) => setTodoFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-semibold text-[#0B122B] focus:outline-none focus:border-[#3562E8] transition-colors cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Active / Pending</option>
            <option value="DONE">Completed / Done</option>
          </select>

          <select
            value={todoFilterPriority}
            onChange={(e) => setTodoFilterPriority(e.target.value as any)}
            className="w-full px-3 py-2 bg-[#F8F9FE] border border-[#E2E6F0] rounded-xl text-xs font-semibold text-[#0B122B] focus:outline-none focus:border-[#3562E8] transition-colors cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3 pt-2">
        {paginatedItems.map((item) => {
          if (item.kind === "TASK") {
            const task = item.data;
            const isPersonal = isTaskPersonal(task);
            const isDone = task.status === "DONE";
            const assigneeNames =
              task.assignments
                ?.map((a: any) => a.assignee?.user?.fullName)
                .filter(Boolean)
                .join(", ") || (isPersonal ? "Myself" : "Unassigned");

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isDone
                    ? "bg-[#F8F9FE]/60 border-[#E2E6F0] opacity-75"
                    : "bg-white border-[#E2E6F0] hover:border-[#CEDEFF] shadow-2xs"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleExecutiveTaskStatus(task)}
                    className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      isDone
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-slate-300 hover:border-[#3562E8] bg-white text-transparent"
                    }`}
                    title={isDone ? "Mark as active" : "Mark as completed"}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isDone ? "line-through text-[#696E82]" : "text-[#0B122B]"
                        }`}
                      >
                        {task.title}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            task.priority === "URGENT"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : task.priority === "HIGH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : task.priority === "LOW"
                              ? "bg-slate-100 text-[#696E82]"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {task.priority}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isPersonal
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {isPersonal ? "Personal" : `Assigned: ${assigneeNames}`}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-[#696E82] line-clamp-2">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-[#696E82] pt-1">
                      {task.category && (
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Tag className="w-3 h-3 text-[#3562E8]" />
                          <span>{task.category}</span>
                        </span>
                      )}
                      {task.project && (
                        <span className="font-mono font-semibold text-slate-600">
                          {task.project.code}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Due {task.dueDate}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.kind === "MEETING") {
            const meet = item.data;
            return (
              <div
                key={meet.id}
                className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 hover:border-indigo-300 transition-all shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#0B122B]">{meet.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {meet.meetingType?.replace(/_/g, " ") || "MEETING"}
                      </span>
                    </div>
                    {meet.agenda && <p className="text-xs text-[#696E82] line-clamp-1">{meet.agenda}</p>}
                    <div className="flex items-center justify-between text-[11px] text-[#696E82] pt-1">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3 h-3 text-[#3562E8]" />
                        <span>
                          {meet.meetingDate} • {meet.startTime} – {meet.endTime}
                        </span>
                      </span>
                      <button
                        onClick={() => router.push(`/w/${workspaceSlug}/meetings`)}
                        className="text-[#3562E8] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Open calendar</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.kind === "NOTE") {
            const note = item.data;
            return (
              <div
                key={note.id}
                className="p-4 rounded-2xl border border-amber-200/60 bg-amber-50/20 hover:border-amber-300 transition-all shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#0B122B]">{note.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {note.tag || "Note"}
                      </span>
                    </div>
                    {note.content && (
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-[#696E82] pt-1 border-t border-amber-100/60 mt-2">
                      <span>{new Date(note.createdAt).toLocaleDateString("en-GB")}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onCopyNote(`${note.title}\n${note.content}`)}
                          className="hover:text-[#3562E8] flex items-center gap-1 cursor-pointer"
                          title="Copy note"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {combinedItems.length === 0 && (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center border-2 border-dashed border-[#E2E6F0] rounded-2xl">
            <ListTodo className="w-8 h-8 text-[#696E82]/50 mb-2" />
            <h4 className="text-sm font-bold text-[#0B122B]">No items match your filter</h4>
            <p className="text-xs text-[#696E82] mt-0.5 mb-4">
              Create a new task, schedule a meeting or save a leadership note.
            </p>
            <button
              onClick={() => onOpenCreate("TASK")}
              className="px-4 py-2 rounded-xl bg-[#3562E8] text-white text-xs font-bold hover:bg-[#284ebd] cursor-pointer"
            >
              + Create First Item
            </button>
          </div>
        )}

        {combinedItems.length > 0 && (
          <AdvancedPagination
            {...paginationProps}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        )}
      </div>
    </div>
  );
}

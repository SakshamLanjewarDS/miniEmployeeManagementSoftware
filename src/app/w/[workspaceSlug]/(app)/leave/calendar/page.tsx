"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Flame,
  Users,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Filter,
} from "lucide-react";

export default function TeamLeaveCalendarPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<any | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>("");

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        workspaceSlug,
        year: currentYear.toString(),
        month: currentMonth.toString(),
        ...(departmentFilter ? { department: departmentFilter } : {}),
      });

      const res = await fetch(`/api/leave/calendar?${q.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setMatrixData(data);
        if (data.days && data.days.length > 0) {
          // Default select first day with collisions or today
          const todayStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          const todayEntry = data.days.find((d: any) => d.date === todayStr);
          setSelectedDay(todayEntry || data.days[0]);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [workspaceSlug, currentYear, currentMonth, departmentFilter]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#696E82] mb-1">
            <Link
              href={`/w/${workspaceSlug}/leave`}
              className="hover:text-[#5A81FA] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Leave Records</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#1F1F1F]">Absence Matrix</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1F1F1F] tracking-tight">Team Leave & Collision Calendar</h1>
          <p className="text-xs text-[#696E82] mt-0.5">
            Real-time overlap detection • Bottleneck warning heatmap (≥3 simultaneous staff absences)
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-[#E2E6F0] rounded-2xl p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#1F1F1F] min-w-[120px] text-center font-mono">
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#696E82] hover:bg-[#F8F9FE] hover:text-[#1F1F1F] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#E2E6F0] rounded-xl text-[#1F1F1F] focus:outline-none focus:border-[#5A81FA] shadow-2xs"
          >
            <option value="">All Departments</option>
            <option value="Architecture">Architecture</option>
            <option value="Interior Design">Interior Design</option>
            <option value="3D Visualisation">3D Visualisation</option>
            <option value="Administration">Administration</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {matrixData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
              <span>Staff Taking Leave</span>
              <Users className="w-4 h-4 text-[#5A81FA]" />
            </div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
              {matrixData.totalUniqueEmployeesAbsent}
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">Unique staff members this month</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
              <span>Total Absence Days</span>
              <CalendarIcon className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
              {matrixData.totalAbsenceDaysCount}
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">Cumulative staff days away</div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#E2E6F0] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#696E82] font-semibold uppercase tracking-wider">
              <span>Peak Day Collision</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-[#1F1F1F] mt-2 font-mono">
              {matrixData.maxCollisionCount} Staff
            </div>
            <div className="text-[11px] text-[#696E82] mt-0.5">Max simultaneous absence</div>
          </div>

          <div className="p-4 bg-[#F2F4FF] rounded-2xl border border-[#CEDEFF] shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#2C308D] font-semibold uppercase tracking-wider">
              <span>Bottleneck Days</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-[#2C308D] mt-2 font-mono">
              {matrixData.criticalDates?.length || 0}
            </div>
            <div className="text-[11px] text-[#4870EB] mt-0.5">Dates with ≥ 3 staff away</div>
          </div>
        </div>
      )}

      {/* Main Grid: Calendar Matrix & Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Matrix (Left 2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1F1F1F]">
              Daily Absence Matrix ({monthNames[currentMonth - 1]} {currentYear})
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-[#696E82]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Normal (1 absent)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span>Collision (2 absent)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Bottleneck (≥3 absent)</span>
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-[#696E82]">Calculating team leave matrix...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div
                  key={dayName}
                  className="p-2 text-center text-[11px] font-bold text-[#696E82] uppercase tracking-wider"
                >
                  {dayName}
                </div>
              ))}

              {/* Day cells */}
              {matrixData?.days?.map((day: any) => {
                const dayNum = parseInt(day.date.split("-")[2], 10);
                const isSelected = selectedDay?.date === day.date;

                let badgeColor = "bg-gray-50 border-gray-100 text-gray-500";
                if (day.isBottleneck) {
                  badgeColor = "bg-rose-50 border-rose-200 text-rose-800 font-bold";
                } else if (day.hasCollision) {
                  badgeColor = "bg-amber-50 border-amber-200 text-amber-800 font-bold";
                } else if (day.totalAbsent > 0) {
                  badgeColor = "bg-emerald-50 border-emerald-200 text-emerald-800";
                }

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[76px] p-2 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-[#5A81FA] ring-2 ring-[#5A81FA]/30 bg-[#F2F4FF]"
                        : "border-[#E2E6F0] hover:bg-[#F8F9FE]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1F1F1F] font-mono">{dayNum}</span>
                      {day.isBottleneck && <Flame className="w-3.5 h-3.5 text-rose-500" />}
                      {!day.isBottleneck && day.hasCollision && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>

                    {day.totalAbsent > 0 ? (
                      <div className={`mt-1 p-1 rounded-lg text-[10px] text-center border ${badgeColor}`}>
                        <span>{day.totalAbsent} absent</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">All present</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Detail Panel (Right Column) */}
        <div className="bg-white rounded-3xl border border-[#E2E6F0] p-5 shadow-2xs space-y-4">
          <div className="border-b border-[#E2E6F0] pb-3">
            <span className="text-[11px] font-bold text-[#5A81FA] uppercase tracking-wider">Date Inspector</span>
            <h3 className="text-base font-bold text-[#1F1F1F] mt-0.5">
              {selectedDay
                ? new Date(selectedDay.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Select a date"}
            </h3>
          </div>

          {selectedDay && (
            <div className="space-y-4 text-xs">
              {/* Collision warning banner */}
              {selectedDay.isBottleneck && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                  <Flame className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <div className="font-bold">Studio Bottleneck Warning</div>
                    <div className="text-[11px] mt-0.5">
                      3 or more team members are absent on this date. Review deliverables and project deadlines.
                    </div>
                  </div>
                </div>
              )}

              {!selectedDay.isBottleneck && selectedDay.hasCollision && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <div className="font-bold">Absence Overlap Warning</div>
                    <div className="text-[11px] mt-0.5">
                      2 team members have overlapping leave requests on this date.
                    </div>
                  </div>
                </div>
              )}

              {/* Department breakdown */}
              {Object.keys(selectedDay.departmentCounts || {}).length > 0 && (
                <div>
                  <h4 className="font-bold text-[#1F1F1F] mb-2 uppercase text-[10px] tracking-wider text-[#696E82]">
                    Absence by Department
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(selectedDay.departmentCounts).map(([dept, count]: any) => (
                      <span
                        key={dept}
                        className="px-2.5 py-1 rounded-lg bg-[#F8F9FD] border border-[#E2E6F0] text-[11px] font-medium text-[#1F1F1F]"
                      >
                        {dept}: <strong className="font-mono text-[#5A81FA]">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Absent staff list */}
              <div>
                <h4 className="font-bold text-[#1F1F1F] mb-2 uppercase text-[10px] tracking-wider text-[#696E82]">
                  Absent Staff Details ({selectedDay.absentEmployees?.length || 0})
                </h4>

                {selectedDay.absentEmployees?.length === 0 ? (
                  <div className="p-8 text-center text-[#696E82] bg-[#F8F9FD] rounded-2xl border border-[#E2E6F0]">
                    Full team presence recorded on this day.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDay.absentEmployees.map((emp: any) => (
                      <div
                        key={emp.leaveId}
                        className="p-3 bg-[#F8F9FD] rounded-xl border border-[#E2E6F0] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-[#1F1F1F]">{emp.employeeName}</div>
                          <div className="text-[11px] text-[#696E82] font-mono mt-0.5">
                            {emp.employeeId} • {emp.department}
                          </div>
                          <div className="text-[10px] text-[#5A81FA] font-medium mt-0.5">
                            {emp.days} Day(s) • {emp.leaveType}
                          </div>
                        </div>

                        <div>
                          {emp.status === "APPROVED" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Approved
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

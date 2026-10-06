"use client";

import { Download, FileDown, Filter, MessageCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExportAttendanceRecord, exportAttendanceToExcel, exportAttendanceToPDF } from "@/lib/exportUtils";

type Role = "STUDENT" | "TEACHER" | "STAFF" | "PARENT";
type AttendanceStatus = "PRESENT" | "LATE";

type AttendanceRecord = {
  id: string;
  timestamp: string;
  status: AttendanceStatus;
  snapshotUrl?: string | null;
  user: {
    id: string;
    name: string;
    role: Role;
    phone?: string | null;
    class?: { id: string; name: string } | null;
    division?: { id: string; name: string } | null;
  };
};

type MetaOption = { id: string; name: string };

type AttendanceResponse = {
  records: AttendanceRecord[];
  classes: MetaOption[];
  divisions: MetaOption[];
  users: { id: string; name: string; role: Role }[];
  mockMode: boolean;
};

const timeframeOptions = ["WEEKLY", "MONTHLY", "SEMESTER", "ACADEMIC_YEAR"] as const;
type Timeframe = (typeof timeframeOptions)[number];

export default function DashboardPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<MetaOption[]>([]);
  const [divisions, setDivisions] = useState<MetaOption[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifyResult, setNotifyResult] = useState<string>("");

  const [role, setRole] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [divisionId, setDivisionId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [timeframe, setTimeframe] = useState<Timeframe>("WEEKLY");

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set("role", role);
      if (classId) params.set("classId", classId);
      if (divisionId) params.set("divisionId", divisionId);
      if (userId) params.set("userId", userId);
      params.set("timeframe", timeframe);

      const response = await fetch(`/api/attendance?${params.toString()}`);
      const data: AttendanceResponse = await response.json();

      setRecords(data.records ?? []);
      setUsers(data.users ?? []);
      setClasses(data.classes ?? []);
      setDivisions(data.divisions ?? []);
      setMockMode(Boolean(data.mockMode));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, classId, divisionId, userId, timeframe]);

  const summary = useMemo(() => {
    const total = records.length;
    const present = records.filter((record) => record.status === "PRESENT").length;
    const late = records.filter((record) => record.status === "LATE").length;
    const today = records.filter(
      (record) => new Date(record.timestamp).toDateString() === new Date().toDateString(),
    ).length;
    return { total, present, late, today };
  }, [records]);

  const exportData: ExportAttendanceRecord[] = useMemo(
    () =>
      records.map((record) => ({
        name: record.user.name,
        role: record.user.role,
        className: record.user.class?.name,
        divisionName: record.user.division?.name,
        status: record.status,
        timestamp: record.timestamp,
      })),
    [records],
  );

  const sendToParent = async (record: AttendanceRecord) => {
    setNotifyResult("");
    const phone = record.user.phone;
    if (!phone) {
      setNotifyResult("Selected student does not have parent phone data.");
      return;
    }

    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        message: `Attendance update: ${record.user.name} is ${record.status} at ${new Date(record.timestamp).toLocaleString()}.`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setNotifyResult(data.error ?? "Failed to generate WhatsApp link");
      return;
    }

    setNotifyResult(`Generated WhatsApp link: ${data.waUrl}`);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-cyan-200">Attendance Dashboard</h1>
          <p className="text-sm text-slate-300">Filter attendance and export reports for stakeholders.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded border border-cyan-500/30 px-3 py-2 text-xs">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {mockMode ? (
        <div className="rounded border border-amber-500/30 bg-amber-950/30 p-2 text-xs text-amber-100">
          Database is not configured. Showing demo fallback data.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", value: summary.total },
          { label: "Present", value: summary.present },
          { label: "Late", value: summary.late },
          { label: "Today", value: summary.today },
        ].map((card) => (
          <div key={card.label} className="rounded border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-400">{card.label}</p>
            <p className="text-2xl font-semibold text-cyan-200">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded border border-slate-700 bg-slate-900/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-cyan-200">
          <Filter size={14} /> Filters
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm">
            <option value="">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="STAFF">Staff</option>
            <option value="PARENT">Parent</option>
          </select>

          <select value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm">
            <option value="">All Classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm"
          >
            <option value="">All Divisions</option>
            {divisions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={userId} onChange={(event) => setUserId(event.target.value)} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm">
            <option value="">All People</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select value={timeframe} onChange={(event) => setTimeframe(event.target.value as Timeframe)} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm">
            {timeframeOptions.map((option) => (
              <option key={option} value={option}>
                {option.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => exportAttendanceToExcel(exportData)}
          className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs"
        >
          <Download size={14} /> Export to Excel
        </button>
        <button
          onClick={() => exportAttendanceToPDF(exportData)}
          className="inline-flex items-center gap-2 rounded border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs"
        >
          <FileDown size={14} /> Export to PDF
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-slate-700 bg-slate-900/70">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Division</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={7}>
                  Loading attendance records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-400" colSpan={7}>
                  No records available.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{record.user.name}</td>
                  <td className="px-3 py-2">{record.user.role}</td>
                  <td className="px-3 py-2">{record.user.class?.name ?? "-"}</td>
                  <td className="px-3 py-2">{record.user.division?.name ?? "-"}</td>
                  <td className="px-3 py-2">{record.status}</td>
                  <td className="px-3 py-2">{new Date(record.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {record.user.role === "STUDENT" ? (
                      <button
                        onClick={() => sendToParent(record)}
                        className="inline-flex items-center gap-1 rounded border border-cyan-500/30 px-2 py-1 text-xs"
                      >
                        <MessageCircle size={12} /> Send to Parent
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {notifyResult ? <p className="rounded border border-cyan-500/20 bg-cyan-950/30 p-2 text-xs text-cyan-100">{notifyResult}</p> : null}
    </section>
  );
}

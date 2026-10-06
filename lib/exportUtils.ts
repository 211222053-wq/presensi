import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportAttendanceRecord = {
  name: string;
  role: string;
  className?: string | null;
  divisionName?: string | null;
  status: string;
  timestamp: string;
};

const toRows = (records: ExportAttendanceRecord[]) =>
  records.map((record) => ({
    Name: record.name,
    Role: record.role,
    Class: record.className ?? "-",
    Division: record.divisionName ?? "-",
    Status: record.status,
    Timestamp: new Date(record.timestamp).toLocaleString(),
  }));

export const exportAttendanceToExcel = (records: ExportAttendanceRecord[], fileName = "attendance_report") => {
  if (typeof window === "undefined") return;

  const worksheet = XLSX.utils.json_to_sheet(toRows(records));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportAttendanceToPDF = (records: ExportAttendanceRecord[], fileName = "attendance_report") => {
  if (typeof window === "undefined") return;

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Attendance Report", 14, 16);

  autoTable(doc, {
    startY: 22,
    head: [["Name", "Role", "Class", "Division", "Status", "Timestamp"]],
    body: toRows(records).map((row) => [row.Name, row.Role, row.Class, row.Division, row.Status, row.Timestamp]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 24, 33] },
  });

  doc.save(`${fileName}.pdf`);
};

// src/utils/exportUtils.js
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToExcel = (data) => {
  const formatted = data.map((s, i) => ({
    Rank: i + 1,
    Name: s.Name || "",
    "Enrolment No": s["ENROLMENT NUMBER"] || "",
    Position: s.POSITION || "",
    Cluster: s.CLUSTER || "",
    "Activity Points": s.ACTIVITY || 0,
    "Reward Points": s.REWARD || 0,
    Courses: s.COURSE_COUNT || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formatted);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([excelBuffer], { type: "application/octet-stream" }),
    "BugSlayers_Report.xlsx"
  );
};

export const exportToPDF = (data) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Bug Slayers Dashboard Report", 14, 15);

    autoTable(doc, {
      head: [["#", "Name", "Position", "Cluster", "Activity", "Reward", "Courses"]],
      body: data.map((s, i) => [
        i + 1,
        s.Name || "",
        s.POSITION || "",
        s.CLUSTER || "",
        s.ACTIVITY || 0,
        s.REWARD || 0,
        s.COURSE_COUNT || 0,
      ]),
      startY: 25,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 122, 255] },
    });

    doc.save("BugSlayers_Report.pdf");
  } catch (err) {
    console.error("PDF export error:", err);
    alert("PDF export failed. Check the console for details.");
  }
};

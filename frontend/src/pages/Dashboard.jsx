import { useEffect, useState, useCallback } from "react";
import StatCards       from "../components/StatCards";
import EmployeeTable   from "../components/EmployeeTable";
import TrendChart      from "../components/TrendChart";
import DepartmentChart from "../components/DepartmentChart";
import CheckHistory    from "../components/CheckHistory";
import {
  buildDashboardWorkbook,
  workbookToBlob,
  formatDashboardExportFilename,
  createAndClickDownload,
} from "../lib/exportDashboardExcel";

const API = "http://localhost:5000";

export default function Dashboard({ latestUpdate }) {
  const [stats,       setStats]       = useState(null);
  const [employees,   setEmployees]   = useState([]);
  const [trend,       setTrend]       = useState([]);
  const [departments, setDepartments] = useState([]);
  const [checks,      setChecks]      = useState([]);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [excelUrl,    setExcelUrl]    = useState(null);
  const [excelName,   setExcelName]   = useState(null);
  const [autoDownloadExcel, setAutoDownloadExcel] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, empRes, trendRes, deptRes, checksRes] = await Promise.all([
        fetch(`${API}/api/stats`),
        fetch(`${API}/api/employees/status`),
        fetch(`${API}/api/trend`),
        fetch(`${API}/api/departments`),
        fetch(`${API}/api/checks?limit=30`)
      ]);

      const [statsData, empData, trendData, deptData, checksData] = await Promise.all([
        statsRes.json(),
        empRes.json(),
        trendRes.json(),
        deptRes.json(),
        checksRes.json()
      ]);

      setStats(statsData);
      setEmployees(empData);
      setTrend(trendData);
      setDepartments(deptData);
      setChecks(checksData);
      setLastRefresh(new Date().toLocaleTimeString());
      setLoading(false);

      // Auto-generate a fresh Excel export whenever dashboard data refreshes
      try {
        const wb = buildDashboardWorkbook({
          stats: statsData,
          employees: empData,
          trend: trendData,
          departments: deptData,
          checks: checksData,
        });
        const blob = workbookToBlob(wb);
        const nextUrl = URL.createObjectURL(blob);
        const nextName = formatDashboardExportFilename(new Date());

        setExcelName(nextName);
        setExcelUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });

        if (autoDownloadExcel) {
          createAndClickDownload(nextUrl, nextName);
        }
      } catch (e) {
        console.error("Excel export generation failed:", e);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  }, [autoDownloadExcel]);

  // Initial fetch
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refresh when WebSocket update arrives
  useEffect(() => {
    if (latestUpdate) {
      fetchAll();
    }
  }, [latestUpdate, fetchAll]);

  // Auto refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (excelUrl) URL.revokeObjectURL(excelUrl);
    };
  }, [excelUrl]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ fontFamily: "var(--font-mono)", color: "var(--amber)" }}
      >
        <div className="text-center">
          <div className="text-2xl mb-3 animate-blink">⬡</div>
          <p>Connecting to IndustriGuard backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Last refresh indicator */}
      {lastRefresh && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
          >
            Last updated: {lastRefresh}
            {latestUpdate && (
              <span style={{ color: "var(--green)" }}>
                {" "}· Live update received from {latestUpdate.employee_id}
              </span>
            )}
          </p>

          <div className="flex items-center gap-3">
            <label
              className="text-xs inline-flex items-center gap-2 select-none"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
            >
              <input
                type="checkbox"
                checked={autoDownloadExcel}
                onChange={(e) => setAutoDownloadExcel(e.target.checked)}
              />
              Auto-download Excel on refresh
            </label>

            <a
              href={excelUrl || undefined}
              download={excelName || undefined}
              className="px-3 py-1.5 text-xs font-semibold tracking-wider uppercase rounded transition-all"
              style={{
                fontFamily: "var(--font-mono)",
                background: excelUrl ? "var(--amber-glow)" : "transparent",
                color: excelUrl ? "var(--amber)" : "var(--text-secondary)",
                border: `1px solid ${excelUrl ? "var(--amber-dim)" : "var(--border)"}`,
                pointerEvents: excelUrl ? "auto" : "none",
                opacity: excelUrl ? 1 : 0.6,
              }}
              title={excelUrl ? "Download the latest dashboard export" : "Export will appear after data loads"}
            >
              Download Excel
            </a>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <StatCards stats={stats} />

      {/* Employee status table — full width */}
      <EmployeeTable employees={employees} latestUpdate={latestUpdate} />

      {/* Trend chart */}
      <TrendChart trend={trend} />

      {/* Department chart */}
      <DepartmentChart departments={departments} />

      {/* Check history */}
      <CheckHistory checks={checks} />
    </div>
  );
}
import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  RAW_JOBS, JOBS_WITH_SALARY, computeStats, getByLevel,
  getByTech, getByCompany, getSalaryDistribution, getLocationSplit,
} from "./data/salaryData";
import "./App.css";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa", "#34d399", "#fb923c"];

const LEVEL_COLORS = {
  Junior: "#10b981",
  Mid: "#6366f1",
  Senior: "#f59e0b",
  Lead: "#f43f5e",
};

const fmt = (n) => (n != null ? `€${Number(n).toLocaleString()}` : "—");

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="tt-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}:{" "}
          {typeof p.value === "number" && !p.name?.toLowerCase().includes("count")
            ? `€${Number(p.value).toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  );
}

function SalaryRangeBar({ min, max }) {
  const domainMax = 9000;
  const left = (min / domainMax) * 100;
  const right = ((max || min) / domainMax) * 100;
  const width = right - left;
  return (
    <div className="range-bar-wrap">
      <div className="range-bar-track">
        <div className="range-bar-fill" style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }} />
      </div>
    </div>
  );
}

export default function App() {
  const [levelFilter, setLevelFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("salaryMin");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const filtered = useMemo(() => {
    let jobs = RAW_JOBS;
    if (levelFilter !== "All") jobs = jobs.filter((j) => j.level === levelFilter);
    if (locationFilter === "Remote") jobs = jobs.filter((j) => j.location === "Remote");
    if (locationFilter === "Košice") jobs = jobs.filter((j) => j.location === "Košice");
    if (search.trim()) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.tech.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...jobs].sort((a, b) => {
      const av = a[sortBy] ?? -1;
      const bv = b[sortBy] ?? -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [levelFilter, locationFilter, search, sortBy, sortDir]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const overallStats = useMemo(() => computeStats(RAW_JOBS), []);
  const byLevel = useMemo(() => getByLevel(RAW_JOBS), []);
  const byTech = useMemo(() => getByTech(RAW_JOBS), []);
  const byCompany = useMemo(() => getByCompany(RAW_JOBS), []);
  const distribution = useMemo(() => getSalaryDistribution(RAW_JOBS), []);
  const locationSplit = useMemo(() => getLocationSplit(RAW_JOBS), []);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }) =>
    sortBy === col ? (
      <span className="sort-icon active">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="sort-icon">⇅</span>
    );

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>Salary Benchmark Dashboard</h1>
            <p className="header-sub">
              Košický kraj · Programmer / Developer · {RAW_JOBS.length} listings ·{" "}
              <a
                href="https://www.profesia.sk/praca/kosicky-kraj/programator/"
                target="_blank"
                rel="noreferrer"
              >
                profesia.sk
              </a>{" "}
              · February 2026
            </p>
          </div>
          <div className="header-badges">
            <span className="badge">
              {JOBS_WITH_SALARY.length} with salary
            </span>
            <span className="badge muted">
              {RAW_JOBS.length - JOBS_WITH_SALARY.length} undisclosed
            </span>
          </div>
        </div>
      </header>

      <main className="main">
        {/* ── KPI Cards ── */}
        <section className="section">
          <h2 className="section-title">Market Overview — {RAW_JOBS.length} total listings</h2>
          <div className="stats-grid">
            <StatCard label="Median Salary" value={fmt(overallStats.median)} sub="gross / month" color="#6366f1" />
            <StatCard label="Average Salary" value={fmt(overallStats.avg)} sub="gross / month" color="#22d3ee" />
            <StatCard label="Min Observed" value={fmt(overallStats.min)} sub="lowest advertised" color="#10b981" />
            <StatCard label="Max Observed" value={fmt(overallStats.max)} sub="highest advertised" color="#f43f5e" />
            <StatCard label="25th Percentile" value={fmt(overallStats.p25)} sub="lower bound" color="#f59e0b" />
            <StatCard label="75th Percentile" value={fmt(overallStats.p75)} sub="upper-mid bound" color="#a78bfa" />
          </div>
        </section>

        {/* ── Distribution + Location ── */}
        <div className="charts-row">
          <section className="chart-card wide">
            <h2 className="section-title">Salary Distribution (€/month, min advertised)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Listings" radius={[4, 4, 0, 0]}>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="chart-card narrow">
            <h2 className="section-title">Work Location</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={locationSplit}
                  cx="50%"
                  cy="42%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {locationSplit.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                />
                <Tooltip formatter={(v) => [`${v} listings`, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* ── By Level + By Tech ── */}
        <div className="charts-row">
          <section className="chart-card">
            <h2 className="section-title">Salary by Seniority</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byLevel} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="level" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg" name="Avg Salary" radius={[4, 4, 0, 0]}>
                  {byLevel.map((entry, i) => (
                    <Cell key={i} fill={LEVEL_COLORS[entry.level]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="level-legend">
              {byLevel.map((l) => (
                <div key={l.level} className="level-row">
                  <span className="level-dot" style={{ background: LEVEL_COLORS[l.level] }} />
                  <strong style={{ color: LEVEL_COLORS[l.level] }}>{l.level}</strong>
                  <span className="level-count">({l.count} jobs)</span>
                  <span className="level-range">
                    {fmt(l.min)} – {fmt(l.max)}
                  </span>
                  <span className="level-avg">avg {fmt(l.avg)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="chart-card">
            <h2 className="section-title">Avg Salary by Technology (≥2 listings)</h2>
            <div className="tech-list">
              {byTech.slice(0, 16).map((t, i) => (
                <div key={t.tech} className="tech-row">
                  <span className="tech-rank">#{i + 1}</span>
                  <span className="tech-name">{t.tech}</span>
                  <span className="tech-count">{t.count}×</span>
                  <div className="tech-bar-wrap">
                    <div
                      className="tech-bar"
                      style={{
                        width: `${(t.avg / byTech[0].avg) * 100}%`,
                        background: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                  <span className="tech-avg">{fmt(t.avg)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── By Company ── */}
        <section className="section">
          <h2 className="section-title">Top Employers — Average Salary vs. Listing Count</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              layout="vertical"
              data={byCompany.slice(0, 12)}
              margin={{ top: 5, right: 100, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="company"
                width={240}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v) => (v.length > 35 ? v.slice(0, 35) + "…" : v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="avg"
                name="Avg Salary"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                label={{
                  position: "right",
                  fill: "#64748b",
                  fontSize: 11,
                  formatter: (v) => {
                    const co = byCompany.find((c) => c.avg === v);
                    return `€${v.toLocaleString()} (${co?.count ?? ""}×)`;
                  },
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* ── Filters & Table ── */}
        <section className="section">
          <h2 className="section-title">All Listings Explorer</h2>
          <div className="filters">
            <input
              className="search-input"
              placeholder="Search by title, company, or tech stack…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <div className="filter-group">
              <label>Level:</label>
              {["All", "Junior", "Mid", "Senior", "Lead"].map((l) => (
                <button
                  key={l}
                  className={`filter-btn ${levelFilter === l ? "active" : ""}`}
                  onClick={() => {
                    setLevelFilter(l);
                    setPage(1);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="filter-group">
              <label>Location:</label>
              {["All", "Remote", "Košice"].map((l) => (
                <button
                  key={l}
                  className={`filter-btn ${locationFilter === l ? "active" : ""}`}
                  onClick={() => {
                    setLocationFilter(l);
                    setPage(1);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="results-count">{filtered.length} results</span>
          </div>

          {filtered.length > 0 && (
            <div className="filtered-stats">
              <span>
                Filtered median: <strong>{fmt(stats.median)}</strong>
              </span>
              <span>
                Avg: <strong>{fmt(stats.avg)}</strong>
              </span>
              <span>
                Range: <strong>{fmt(stats.min)} – {fmt(stats.max)}</strong>
              </span>
              <span>
                With salary data: <strong>{stats.withSalaryCount}/{stats.count}</strong>
              </span>
            </div>
          )}

          <div className="table-wrap">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort("title")}>
                    Position <SortIcon col="title" />
                  </th>
                  <th>Company</th>
                  <th className="sortable" onClick={() => handleSort("level")}>
                    Level <SortIcon col="level" />
                  </th>
                  <th>Tech</th>
                  <th>Location</th>
                  <th className="sortable" onClick={() => handleSort("salaryMin")}>
                    Min Salary <SortIcon col="salaryMin" />
                  </th>
                  <th className="sortable" onClick={() => handleSort("salaryMax")}>
                    Max Salary <SortIcon col="salaryMax" />
                  </th>
                  <th>Visual Range</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((job, i) => (
                  <tr key={i} className={job.salaryMin === null ? "no-salary" : ""}>
                    <td className="title-cell">{job.title}</td>
                    <td className="company-cell">{job.company}</td>
                    <td>
                      <span
                        className="level-badge"
                        style={{
                          background: LEVEL_COLORS[job.level] + "22",
                          color: LEVEL_COLORS[job.level],
                          borderColor: LEVEL_COLORS[job.level],
                        }}
                      >
                        {job.level}
                      </span>
                    </td>
                    <td>
                      <div className="tech-tags">
                        {job.tech.slice(0, 3).map((t) => (
                          <span key={t} className="tech-tag">
                            {t}
                          </span>
                        ))}
                        {job.tech.length > 3 && (
                          <span className="tech-tag more">+{job.tech.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`loc-badge ${
                          job.location === "Remote" ? "remote" : "office"
                        }`}
                      >
                        {job.location}
                      </span>
                    </td>
                    <td className="salary-cell">
                      {job.salaryMin != null ? (
                        <strong>{fmt(job.salaryMin)}</strong>
                      ) : (
                        <span className="undisclosed">Undisclosed</span>
                      )}
                    </td>
                    <td className="salary-cell">
                      {job.salaryMax && job.salaryMax !== job.salaryMin
                        ? fmt(job.salaryMax)
                        : job.salaryMin
                        ? "+"
                        : "—"}
                    </td>
                    <td>
                      {job.salaryMin != null && (
                        <SalaryRangeBar
                          min={job.salaryMin}
                          max={job.salaryMax || job.salaryMin}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={page === p ? "active" : ""}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next →
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
            </div>
          )}
        </section>

        {/* ── Hiring Insights ── */}
        <section className="section">
          <h2 className="section-title">Hiring Insights & Recommendations</h2>
          <div className="insights-grid">
            {[
              {
                icon: "💡",
                title: "Senior Market Rate",
                body: "Senior developers command €3,100–€3,700/month. Deutsche Telekom IT Solutions is the dominant employer and sets the benchmark anchor.",
              },
              {
                icon: "🎯",
                title: "Junior Sweet Spot",
                body: "Junior roles cluster €1,400–€2,000/month. Offering ≥€1,800 puts you in a competitive position. ESET and Caterpillar set the upper junior bar at €2,000–€2,300.",
              },
              {
                icon: "📍",
                title: "Remote Dominates",
                body: "60%+ of listings are fully remote. Requiring on-site Košice presence means you need to offer a 10–15% premium to attract comparable talent.",
              },
              {
                icon: "🔥",
                title: "AI/ML Commands Premium",
                body: "AI, LLM, and ML-related roles advertise €3,000–€5,000+/month — currently among the highest-paying specializations in the region.",
              },
              {
                icon: "⚡",
                title: "Java Is the Backbone",
                body: "Java appears in the most listings across all seniority levels. Java Leads at Caterpillar and NetCore reach €4,100–€4,625/month.",
              },
              {
                icon: "🏆",
                title: "Lead/Architect Ceiling",
                body: "Lead and architect roles range €4,000–€8,100/month. Budget €5,000+ to attract strong senior architects. Pro HR and EuroView post the highest advertised bands.",
              },
            ].map((ins) => (
              <div key={ins.title} className="insight-card">
                <div className="insight-icon">{ins.icon}</div>
                <h3>{ins.title}</h3>
                <p>{ins.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="footer">
          Data scraped from{" "}
          <a
            href="https://www.profesia.sk/praca/kosicky-kraj/programator/"
            target="_blank"
            rel="noreferrer"
          >
            profesia.sk
          </a>{" "}
          · February 2026 · {RAW_JOBS.length} listings across 9 pages ·
          Salaries are EUR gross/month unless otherwise noted
        </footer>
      </main>
    </div>
  );
}

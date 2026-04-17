export default function Navbar({ page, setPage, dark, setDark, search, setSearch }) {
  return (
    <div className="nav">
      <h1 className="logo">Bug Slayers Dashboard</h1>

      <div className="nav-right">
        {/* SEARCH IN NAVBAR (TOP RIGHT) */}
        <input
          className="search"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="controls">
          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            🏠 <span>Dashboard</span>
          </button>

          <button
            className={page === "leaderboard" ? "active" : ""}
            onClick={() => setPage("leaderboard")}
          >
            🏆 <span>Leaderboard</span>
          </button>

          <button onClick={() => setDark(!dark)}>
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
    </div>
  );
}
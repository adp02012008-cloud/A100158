import logo from "../assets/logo.png";

export default function Navbar({
  page,
  setPage,
  dark,
  setDark,
  search,
  setSearch,
}) {
  return (
    <div className="nav">
      {/* LOGO SECTION */}
      <div className="logo-wrap">
        <img
          src={logo}
          className="logo-img"
          alt="Bug Slayers Logo"
        />
        <h1 className="logo">Bug Slayers</h1>
      </div>

      {/* RIGHT SIDE */}
      <div className="nav-right">
        {/* SEARCH */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* BUTTONS */}
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
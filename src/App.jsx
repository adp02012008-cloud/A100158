// src/App.jsx
import { useState } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Hackathons from "./pages/Hackathons";
import Gallery from "./pages/Gallery";
import Projects from "./pages/Projects";
import Certificates from "./pages/Certificates";
import Opportunities from "./pages/Opportunities";
import LoginGate from "./components/LoginGate";
import { useAuth } from "./context/AuthContext";
import { TEAM_PAGE_KEYS } from "./config/teamSections";
import "./App.css";

export default function App() {
  const { isTeamMember } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");

  const visiblePage =
    !isTeamMember && TEAM_PAGE_KEYS.includes(page) ? "dashboard" : page;

  const changePage = (nextPage) => {
    const allowedPage =
      !isTeamMember && TEAM_PAGE_KEYS.includes(nextPage) ? "dashboard" : nextPage;
    setSearch("");
    setPage(allowedPage);
  };

  return (
    <LoginGate>
      <div className="app">
        <Navbar
          page={visiblePage}
          setPage={changePage}
          search={search}
          setSearch={setSearch}
        />

        <main className="page-content">
          {visiblePage === "dashboard" && <Dashboard search={search} />}
          {visiblePage === "leaderboard" && <Leaderboard search={search} />}

          {isTeamMember && visiblePage === "hackathons" && <Hackathons search={search} />}
          {isTeamMember && visiblePage === "gallery" && <Gallery search={search} />}
          {isTeamMember && visiblePage === "projects" && <Projects search={search} />}
          {isTeamMember && visiblePage === "certificates" && <Certificates search={search} />}
          {isTeamMember && visiblePage === "opportunities" && <Opportunities search={search} />}
        </main>
      </div>
    </LoginGate>
  );
}

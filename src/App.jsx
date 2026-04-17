import { useState } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");

  return (
    <div className={dark ? "app dark" : "app"}>
      <Navbar
        page={page}
        setPage={setPage}
        dark={dark}
        setDark={setDark}
        search={search}
        setSearch={setSearch}
      />

      {page === "dashboard" && <Dashboard search={search} />}
      {page === "leaderboard" && <Leaderboard search={search} />}
    </div>
  );
}
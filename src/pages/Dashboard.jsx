import { useEffect, useState } from "react";
import axios from "axios";
import { STUDENT_URL, COURSE_URL } from "../utils/api";
import StudentCard from "../components/StudentCard";
import Modal from "../components/Modal";

export default function Dashboard({ search }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const normalize = (str) =>
    str?.toLowerCase().replace(/\s+/g, "").trim();

  const getCourses = (name, courses) => {
    let list = [];

    courses.forEach((row) => {
      const keys = Object.keys(row);
      const courseName = row[keys[0]]?.trim();

      const key = keys.find(
        (k) => normalize(k) === normalize(name)
      );

      const val = key ? row[key]?.trim() : null;

      if (
        courseName &&
        val &&
        val !== "NIL" &&
        val !== "NUL" &&
        val !== ""
      ) {
        list.push(`${courseName} - ${val}`);
      }
    });

    return list;
  };

  const loadData = async () => {
    try {
      const s = await axios.get(STUDENT_URL);
      const c = await axios.get(COURSE_URL);

      const cleaned = s.data.map((st) => {
        const courseList = getCourses(st.Name, c.data);

        return {
          ...st,
          Name: (st.Name || "").trim(),
          POSITION: (st.POSITION || "").trim(),
          JOINED: (st.JOINED || "").trim(),

          ACTIVITY: Number(st["ACTIVITY POINT"] || 0),
          REWARD: Number(st["REWARD POINT"] || 0),

          LINKEDIN:
            st.LINKEDIN ||
            st["LinkedIn"] ||
            st["Linked In"] ||
            "",

          GITHUB:
            st.GITHUB ||
            st["GitHub"] ||
            st["Git Hub"] ||
            "",

          COURSES: courseList,
          COURSE_COUNT: courseList.length,
        };
      });

      setStudents(cleaned);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const filtered = students.filter((s) =>
    s.Name.toLowerCase().includes(search.toLowerCase())
  );

  const totalActivity = students.reduce((sum, s) => sum + s.ACTIVITY, 0);
  const avgActivity =
    students.length > 0 ? totalActivity / students.length : 0;

  return (
    <div>
      <div className="stats">
        <div className="stat-box">
          <h3>Total Activity</h3>
          <p>{totalActivity}</p>
        </div>

        <div className="stat-box">
          <h3>Average Activity</h3>
          <p>{avgActivity.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid">
        {filtered.map((s, i) => (
          <StudentCard
            key={i}
            student={s}
            avgActivity={avgActivity}
            onClick={setSelected}
          />
        ))}
      </div>

      {selected && (
        <Modal student={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
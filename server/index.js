import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import clusterRoutes from "./routes/clusterRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import pointRoutes from "./routes/pointRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import hackathonRoutes from "./routes/hackathonRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import opportunityRoutes from "./routes/opportunityRoutes.js";
import customCollectionRoutes from "./routes/customCollectionRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Root Landing & Health Check Routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "⚡ Bug Slayers Master API Server is Running",
    status: "OK",
    healthCheck: "/api/health",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/clusters", clusterRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/points", pointRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/hackathons", hackathonRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/custom-collections", customCollectionRoutes);

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`⚡ Express Bug Slayers Master Server running on port ${PORT}`);
  });

  connectDB()
    .then(() => {
      console.log("✅ Database initialized successfully.");
    })
    .catch((err) => {
      console.warn("⚠️ Database connection error:", err.message);
    });
}

import express from "express";
import { verifyAuthToken } from "../middleware/authMiddleware.js";
import { getCertificates, createCertificate, updateCertificate, deleteCertificate } from "../controllers/certificateController.js";

const router = express.Router();

router.use(verifyAuthToken);

router.get("/", getCertificates);
router.post("/", createCertificate);
router.put("/:id", updateCertificate);
router.delete("/:id", deleteCertificate);

export default router;

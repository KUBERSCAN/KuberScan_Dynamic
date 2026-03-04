import express, { Request, Response } from "express";
import { Incident } from "../DB/incidents.ts";

const router = express.Router();

router.delete("/", async (req: Request, res: Response) => {
  try {
    const { pod, namespace, id } = req.body;

    if ((!pod || !namespace) && !id) {
      return res.status(400).json({ error: "Missing params" });
    }

    const filter = id ? { id } : { pod, namespace };
    const result = await Incident.deleteMany(filter);

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
      filter,
    });
  } catch (_err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

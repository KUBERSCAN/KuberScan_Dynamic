import express, { Request, Response } from "express";
import { Incident } from "../DB/incidents.ts";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      id,
      pod,
      namespace,
      severity,
      alertCount,
      status,
    } = req.body;

    if (!id || !pod || !namespace || !severity) {
      return res.status(400).json({
        error: "Missing params",
        required: ["id", "pod", "namespace", "severity"],
      });
    }

    const normalizedStatus = status || "open";
    if (!["open", "quarantined", "deleted"].includes(normalizedStatus)) {
      return res.status(400).json({
        error: "Invalid status",
        allowed: ["open", "quarantined", "deleted"],
      });
    }

    const exists = await Incident.findOne({ id, pod, namespace });
    if (exists) {
      return res.status(409).json({
        error: "Incident already exists",
        incident: exists,
      });
    }

    const incident = new Incident({
      id,
      pod,
      namespace,
      severity,
      alertCount: Number.isFinite(alertCount) ? Number(alertCount) : 1,
      status: normalizedStatus,
    });

    await incident.save();

    return res.status(201).json({
      success: true,
      incident,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: err?.message,
    });
  }
});

router.delete("/", async (req: Request, res: Response) => {
  try {
    const { _id, pod, namespace, id } = req.body;

    if (!_id && !id && !(pod && namespace)) {
      return res.status(400).json({ error: "Missing params" });
    }

    const filter: Record<string, unknown> = {};
    if (_id) filter._id = _id;
    else if (id) filter.id = id;
    else {
      filter.pod = pod;
      filter.namespace = namespace;
    }

    const result = await Incident.updateMany(filter, {
      $set: { status: "deleted" },
    });

    return res.status(200).json({
      success: true,
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      filter,
      status: "deleted",
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: err?.message,
    });
  }
});

export default router;

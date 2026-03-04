import express, { Request, Response } from "express";
import { CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import { Quarantined } from "../DB/quarantined.ts";
import { Incident } from "../DB/incidents.ts";
import { Alert } from "../DB/alert.ts";

const router = express.Router();

const kc = new KubeConfig();
if (Deno.env.get("KUBERNETES_SERVICE_HOST")) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

const k8sApi = kc.makeApiClient(CoreV1Api);

const upsertDeletedIncident = async (pod: string, namespace: string) => {
  const result = await Incident.updateMany(
    { pod, namespace },
    { $set: { status: "deleted" } },
  );

  if (result.matchedCount === 0) {
    const incident = new Incident({
      id: `${namespace}-${pod}`,
      pod,
      namespace,
      severity: "unknown",
      alertCount: 0,
      status: "deleted",
    });
    await incident.save();
  }
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const { namespace, pod } = req.body;

    if (!pod || !namespace) {
      return res.status(400).json({
        error: "Missing params",
        received: { pod, namespace },
      });
    }

    await k8sApi.deleteNamespacedPod({
      name: pod,
      namespace,
    });

    await Quarantined.deleteMany({
      pod,
      namespace,
    });

    await Alert.deleteMany({
      podname: pod,
      namespace,
    });

    await upsertDeletedIncident(pod, namespace);

    return res.json({
      status: "Pod deleted",
      pod,
      namespace,
      incidentStatus: "deleted",
      alertsDeleted: true,
    });
  } catch (_err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

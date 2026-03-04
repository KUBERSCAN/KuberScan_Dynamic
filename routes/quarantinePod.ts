import {
  CoreV1Api,
  KubeConfig,
  NetworkingV1Api,
} from "@kubernetes/client-node";
import express, { Request, Response } from "express";
import { Quarantined } from "../DB/quarantined.ts";
import { Incident } from "../DB/incidents.ts";

const router = express.Router();

const kc = new KubeConfig();

if (Deno.env.get("KUBERNETES_SERVICE_HOST")) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

const k8sApi = kc.makeApiClient(CoreV1Api);
const networkingApi = kc.makeApiClient(NetworkingV1Api);

const upsertIncidentStatus = async (
  pod: string,
  namespace: string,
  status: "open" | "quarantined" | "deleted",
) => {
  const result = await Incident.updateMany(
    { pod, namespace },
    { $set: { status } },
  );

  if (result.matchedCount === 0) {
    const incident = new Incident({
      id: `${namespace}-${pod}`,
      pod,
      namespace,
      severity: "unknown",
      alertCount: 0,
      status,
    });
    await incident.save();
  }
};

router.post("/", async (req: Request, res: Response) => {
  try {
    const { namespace, pod } = req.body;

    if (!namespace || !pod) {
      return res.status(400).json({ error: "Missing params" });
    }

    await k8sApi.patchNamespacedPod({
      name: pod,
      namespace,
      body: {
        metadata: {
          labels: {
            quarantined: "true",
          },
        },
      },
    });

    const networkPolicy = {
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
      metadata: {
        name: `quarantine-${pod}`,
        namespace,
      },
      spec: {
        podSelector: {
          matchLabels: {
            quarantined: "true",
          },
        },
        policyTypes: ["Ingress", "Egress"],
        ingress: [],
        egress: [],
      },
    };

    try {
      await networkingApi.createNamespacedNetworkPolicy({
        namespace,
        body: networkPolicy,
      });
    } catch (err: any) {
      if (err?.code !== 409) {
        throw err;
      }
    }

    await Quarantined.updateOne(
      { pod, namespace },
      { $set: { pod, namespace } },
      { upsert: true },
    );

    await upsertIncidentStatus(pod, namespace, "quarantined");

    return res.status(200).json({
      success: true,
      pod,
      namespace,
      status: "quarantined",
    });
  } catch (_err) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/", async (req: Request, res: Response) => {
  try {
    const { namespace, pod } = req.body;

    if (!namespace || !pod) {
      return res.status(400).json({ error: "Missing params" });
    }

    try {
      await k8sApi.patchNamespacedPod({
        name: pod,
        namespace,
        body: {
          metadata: {
            labels: {
              quarantined: null,
            },
          },
        },
      });
    } catch (err: any) {
      if (err?.code !== 422) {
        throw err;
      }
    }

    try {
      await networkingApi.deleteNamespacedNetworkPolicy({
        name: `quarantine-${pod}`,
        namespace,
      });
    } catch (err: any) {
      if (err?.code !== 404) {
        throw err;
      }
    }

    await Quarantined.deleteMany({
      pod,
      namespace,
    });

    await upsertIncidentStatus(pod, namespace, "open");

    return res.status(200).json({
      success: true,
      pod,
      namespace,
      status: "open",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

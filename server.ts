import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import alertRoutes from "./routes/alert.ts";
import getAlertsRoutes from "./routes/getAlerts.ts";
import deletePodRoute from "./routes/deletePod.ts";
import quarantinePodRoute from "./routes/quarantinePod.ts";
import getIncidentsRoute from "./routes/getIncidents.ts";
import getQuarantinedRoute from "./routes/getQuarantined.ts";
import incidentRoute from "./routes/incident.ts";

dotenv.config();

const app = express();
const port = 3000;
const mongoUri = Deno.env.get("MONGO_URI") || "";

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use("/alert", alertRoutes);
app.use("/data/alerts", getAlertsRoutes);
app.use("/pod/delete", deletePodRoute);
app.use("/pod/quarantine", quarantinePodRoute);
app.use("/data/incidents", getIncidentsRoute);
app.use("/data/quarantined", getQuarantinedRoute);
app.use("/incident", incidentRoute);

mongoose.connect(mongoUri)
  .then(() => {
    console.log("Conectado a MongoDB");
    app.listen(port, () => console.log(`Servidor en http://localhost:${port}`));
  })
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

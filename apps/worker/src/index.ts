import { DEFAULT_MODEL, SOURCING_QUEUE_NAMES, type QueueReadiness } from "@runacademy/shared";
import { existsSync } from "fs";
import { resolve } from "path";

function describeQueueReadiness() {
  const redisUrl = process.env.REDIS_URL?.trim();

  const queues: QueueReadiness[] = SOURCING_QUEUE_NAMES.map((queueName) => ({
    queueName,
    connected: Boolean(redisUrl),
    detail: redisUrl
      ? `Redis broker ${redisUrl} is available for ${queueName}.`
      : `${queueName} is in inline fallback mode because REDIS_URL is missing.`
  }));

  return {
    mode: redisUrl ? "queue-ready" : "inline-fallback",
    message: redisUrl
      ? `Redis broker detected at ${redisUrl}.`
      : "REDIS_URL is not configured. The API can still run inline sourcing jobs, but the dedicated worker is in scaffold mode.",
    queues
  };
}

function startWorker() {
  const readiness = describeQueueReadiness();
  const apiBaseUrl = process.env.TREND_API_BASE_URL?.trim() || "http://127.0.0.1:4000/v1";
  const pollIntervalMs = Number(process.env.TREND_WORKER_POLL_MS ?? 3000);

  console.log("[worker] started");
  console.log("[worker] default model:", DEFAULT_MODEL);
  console.log("[worker] sourcing queues:", SOURCING_QUEUE_NAMES.join(", "));
  console.log("[worker] mode:", readiness.mode);
  console.log("[worker] detail:", readiness.message);
  console.log("[worker] trend api:", apiBaseUrl);
  readiness.queues.forEach((queue) => {
    console.log(`[worker] queue ${queue.queueName}: ${queue.connected ? "ready" : "fallback"} - ${queue.detail}`);
  });

  let polling = false;

  const tick = async () => {
    if (polling) {
      return;
    }

    polling = true;

    try {
      const response = await fetch(`${apiBaseUrl}/trends/worker/process-next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        processed?: boolean;
        runId?: string;
        taskId?: string;
        period?: string;
        code?: string;
        message?: string;
      };

      if (!response.ok || payload.ok === false) {
        console.error("[worker] trend task failed:", payload.code ?? response.status, payload.message ?? "unknown error");
        return;
      }

      if (payload.processed) {
        console.log(
          `[worker] processed trend task run=${payload.runId ?? "-"} task=${payload.taskId ?? "-"} period=${payload.period ?? "-"}`
        );
      }
    } catch (error) {
      console.error("[worker] poll failed", error);
    } finally {
      polling = false;
    }
  };

  void tick();
  setInterval(() => {
    void tick();
  }, pollIntervalMs);
}

function loadEnvironment() {
  const envLoader = (
    process as typeof process & {
      loadEnvFile?: (path?: string) => void;
    }
  ).loadEnvFile;

  if (!envLoader) {
    return;
  }

  const candidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];

  candidates.forEach((candidatePath) => {
    if (existsSync(candidatePath)) {
      envLoader(candidatePath);
    }
  });
}

loadEnvironment();
startWorker();

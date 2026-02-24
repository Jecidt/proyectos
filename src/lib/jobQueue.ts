// Background job queue for processing Instagram follow orders
// Runs in the Next.js server process

import {
  getDb,
  getAllOrders,
  getOrderById,
  getOrderBotIds,
  getBotById,
  updateOrderStatus,
  updateBotStatus,
  updateBotFollows,
  updateBotLastUsed,
  updateBotSessionCookies,
} from "./db";
import { batchFollowUser, BatchFollowProgress } from "./instagram";

// ─── Job Queue State ──────────────────────────────────────────────────────────

interface Job {
  orderId: string;
  targetUsername: string;
  botIds: string[];
  createdAt: number;
  attempts: number;
}

const jobQueue: Job[] = [];
let isProcessing = false;

// ─── Enqueue a follow order ───────────────────────────────────────────────────

export function enqueueFollowOrder(
  orderId: string,
  targetUsername: string,
  botIds: string[]
): void {
  jobQueue.push({
    orderId,
    targetUsername,
    botIds,
    createdAt: Date.now(),
    attempts: 0,
  });

  // Start processing if not already running
  if (!isProcessing) {
    processNextJob();
  }
}

// ─── Process jobs ─────────────────────────────────────────────────────────────

async function processNextJob(): Promise<void> {
  if (jobQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const job = jobQueue.shift()!;

  try {
    await processFollowJob(job);
  } catch (err) {
    console.error(`[JobQueue] Error processing job for order ${job.orderId}:`, err);

    // Retry up to 2 times
    if (job.attempts < 2) {
      job.attempts++;
      jobQueue.push(job);
    } else {
      // Mark order as failed
      updateOrderStatus(job.orderId, "failed");
      // Release bots back to available
      for (const botId of job.botIds) {
        updateBotStatus(botId, "available");
      }
    }
  }

  // Process next job after a short delay
  setTimeout(processNextJob, 2000);
}

async function processFollowJob(job: Job): Promise<void> {
  console.log(
    `[JobQueue] Processing order ${job.orderId} for @${job.targetUsername} with ${job.botIds.length} bots`
  );

  // Mark order as deployed
  updateOrderStatus(job.orderId, "deployed", { deployed_at: new Date().toISOString() });

  // Get bot details from DB
  const bots = job.botIds
    .map((id) => getBotById(id))
    .filter(Boolean)
    .map((bot) => ({
      id: bot!.id,
      username: bot!.ig_username,
      email: bot!.email,
      password: bot!.password,
      proxy: bot!.proxy || undefined,
      userAgent: bot!.user_agent,
      cookies: bot!.session_cookies || undefined,
    }));

  if (bots.length === 0) {
    updateOrderStatus(job.orderId, "failed");
    return;
  }

  let succeeded = 0;
  let failed = 0;

  // Execute follows with progress tracking
  const result = await batchFollowUser(
    bots,
    job.targetUsername,
    (progress: BatchFollowProgress) => {
      console.log(
        `[JobQueue] Bot @${progress.botUsername}: ${progress.success ? "✅ followed" : `❌ ${progress.error}`}`
      );

      // Update bot stats in real-time
      const bot = getBotById(progress.botId);
      if (bot) {
        if (progress.success) {
          updateBotFollows(
            progress.botId,
            bot.follows_today + 1,
            bot.total_follows_delivered + 1
          );
          updateBotLastUsed(progress.botId);
        } else if (
          progress.error?.toLowerCase().includes("ban") ||
          progress.error?.toLowerCase().includes("suspended") ||
          progress.error?.toLowerCase().includes("disabled")
        ) {
          updateBotStatus(progress.botId, "banned");
        }
      }
    }
  );

  succeeded = result.succeeded;
  failed = result.failed;

  console.log(
    `[JobQueue] Order ${job.orderId} complete: ${succeeded} succeeded, ${failed} failed`
  );

  // Mark order as delivered if at least 50% succeeded
  const successRate = succeeded / bots.length;
  if (successRate >= 0.5) {
    updateOrderStatus(job.orderId, "delivered", { delivered_at: new Date().toISOString() });
  } else {
    updateOrderStatus(job.orderId, "failed");
  }

  // Release bots back to available (unless banned)
  for (const botId of job.botIds) {
    const bot = getBotById(botId);
    if (bot && bot.status !== "banned") {
      updateBotStatus(botId, "available");
    }
  }
}

// ─── Resume pending jobs on startup ──────────────────────────────────────────

export function resumePendingJobs(): void {
  try {
    const db = getDb();
    // Find orders that were processing/deployed but not delivered (server restart)
    const pendingOrders = db
      .prepare(
        "SELECT id, ig_username FROM orders WHERE status IN ('processing', 'deployed') ORDER BY created_at ASC"
      )
      .all() as { id: string; ig_username: string }[];

    for (const order of pendingOrders) {
      const botIds = getOrderBotIds(order.id);
      if (botIds.length > 0) {
        console.log(`[JobQueue] Resuming order ${order.id} for @${order.ig_username}`);
        enqueueFollowOrder(order.id, order.ig_username, botIds);
      }
    }

    if (pendingOrders.length > 0) {
      console.log(`[JobQueue] Resumed ${pendingOrders.length} pending orders`);
    }
  } catch (err) {
    console.error("[JobQueue] Error resuming pending jobs:", err);
  }
}

// ─── Queue status ─────────────────────────────────────────────────────────────

export function getQueueStatus() {
  return {
    queueLength: jobQueue.length,
    isProcessing,
    jobs: jobQueue.map((j) => ({
      orderId: j.orderId,
      targetUsername: j.targetUsername,
      botCount: j.botIds.length,
      attempts: j.attempts,
    })),
  };
}

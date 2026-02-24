// Next.js instrumentation — runs once when the server starts
// Used to resume pending follow jobs after server restart

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { resumePendingJobs } = await import("./lib/jobQueue");
      resumePendingJobs();
      console.log("[Instrumentation] JecidtSebasBoost Pro server started — job queue initialized");
    } catch (err) {
      console.error("[Instrumentation] Failed to initialize job queue:", err);
    }
  }
}

// Real Instagram automation using Puppeteer
// Handles account creation and following users

import puppeteer, { Browser, Page, Cookie } from "puppeteer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IgCredentials {
  username: string;
  email: string;
  password: string;
  proxy?: string;
}

export interface IgRegistrationResult {
  success: boolean;
  userId?: string;
  cookies?: Cookie[];
  error?: string;
  requiresVerification?: boolean;
}

export interface IgFollowResult {
  success: boolean;
  followed?: boolean;
  error?: string;
}

// ─── Browser helpers ─────────────────────────────────────────────────────────

async function launchBrowser(proxy?: string, userAgent?: string): Promise<Browser> {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-accelerated-2d-canvas",
    "--no-first-run",
    "--no-zygote",
    "--disable-gpu",
    "--disable-blink-features=AutomationControlled",
    "--disable-infobars",
    "--window-size=1280,800",
  ];

  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args,
    defaultViewport: { width: 1280, height: 800 },
  });

  return browser;
}

async function setupPage(browser: Browser, userAgent?: string): Promise<Page> {
  const page = await browser.newPage();

  const ua =
    userAgent ||
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

  await page.setUserAgent(ua);

  // Override navigator properties to avoid bot detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["es-ES", "es", "en"] });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  return page;
}

function randomDelay(min = 800, max = 2500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await randomDelay(200, 500);
  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.floor(Math.random() * 120 + 40) });
  }
}

// ─── Instagram Account Registration ──────────────────────────────────────────

export async function registerInstagramAccount(
  creds: IgCredentials,
  userAgent?: string
): Promise<IgRegistrationResult> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser(creds.proxy, userAgent);
    const page = await setupPage(browser, userAgent);

    // Navigate to Instagram signup
    await page.goto("https://www.instagram.com/accounts/emailsignup/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await randomDelay(1500, 3000);

    // Accept cookies if dialog appears
    try {
      const cookieBtn = await page.$('button[class*="cookie"]');
      if (!cookieBtn) {
        // Try common cookie accept buttons
        const buttons = await page.$$("button");
        for (const btn of buttons) {
          const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || "");
          if (text.includes("accept") || text.includes("allow") || text.includes("aceptar")) {
            await btn.click();
            await randomDelay(800, 1500);
            break;
          }
        }
      }
    } catch {
      // Cookie dialog might not appear
    }

    await randomDelay(1000, 2000);

    // Fill in email
    const emailInput = await page.waitForSelector('input[name="emailOrPhone"]', {
      timeout: 15000,
    });
    if (!emailInput) throw new Error("Email input not found");
    await humanType(page, 'input[name="emailOrPhone"]', creds.email);
    await randomDelay(500, 1000);

    // Fill in full name (use username as name)
    const nameInput = await page.$('input[name="fullName"]');
    if (nameInput) {
      const displayName = creds.username
        .replace(/[._]/g, " ")
        .replace(/\d+/g, "")
        .trim()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      await humanType(page, 'input[name="fullName"]', displayName || "User");
      await randomDelay(400, 800);
    }

    // Fill in username
    const usernameInput = await page.$('input[name="username"]');
    if (usernameInput) {
      await humanType(page, 'input[name="username"]', creds.username);
      await randomDelay(600, 1200);
    }

    // Fill in password
    const passwordInput = await page.$('input[name="password"]');
    if (passwordInput) {
      await humanType(page, 'input[name="password"]', creds.password);
      await randomDelay(500, 1000);
    }

    // Click Sign Up button
    const signupBtn = await page.$('button[type="submit"]');
    if (!signupBtn) throw new Error("Signup button not found");
    await signupBtn.click();
    await randomDelay(3000, 5000);

    // Check for birthday page (Instagram requires age verification)
    const currentUrl = page.url();

    if (currentUrl.includes("birthday") || currentUrl.includes("age")) {
      // Fill in birthday (18+ years old)
      try {
        const monthSelect = await page.$('select[title="Month:"]');
        if (monthSelect) {
          await page.select('select[title="Month:"]', "6");
          await randomDelay(300, 600);
        }
        const daySelect = await page.$('select[title="Day:"]');
        if (daySelect) {
          await page.select('select[title="Day:"]', "15");
          await randomDelay(300, 600);
        }
        const yearSelect = await page.$('select[title="Year:"]');
        if (yearSelect) {
          await page.select('select[title="Year:"]', "2000");
          await randomDelay(300, 600);
        }
        const nextBtn = await page.$('button[type="button"]');
        if (nextBtn) {
          await nextBtn.click();
          await randomDelay(2000, 3500);
        }
      } catch {
        // Birthday form might have different structure
      }
    }

    // Check if we need email verification
    const afterUrl = page.url();
    if (
      afterUrl.includes("confirm") ||
      afterUrl.includes("verify") ||
      afterUrl.includes("challenge")
    ) {
      const cookies = await page.cookies();
      return {
        success: true,
        requiresVerification: true,
        cookies,
        error: "Requiere verificación de email",
      };
    }

    // Check if registration succeeded (redirected to home or onboarding)
    if (
      afterUrl.includes("instagram.com") &&
      !afterUrl.includes("emailsignup") &&
      !afterUrl.includes("error")
    ) {
      const cookies = await page.cookies();

      // Try to get user ID from cookies or page
      let userId: string | undefined;
      const dsCookie = cookies.find((c) => c.name === "ds_user_id");
      if (dsCookie) userId = dsCookie.value;

      return {
        success: true,
        userId,
        cookies,
      };
    }

    // Check for error messages
    const errorEl = await page.$('[data-testid="royal_email_signup_error"]');
    if (errorEl) {
      const errorText = await errorEl.evaluate((el) => el.textContent || "");
      return { success: false, error: errorText };
    }

    // Generic failure
    return {
      success: false,
      error: `Registro falló. URL actual: ${afterUrl}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Instagram Login ──────────────────────────────────────────────────────────

export async function loginInstagram(
  creds: IgCredentials,
  userAgent?: string
): Promise<{ success: boolean; cookies?: Cookie[]; userId?: string; error?: string }> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser(creds.proxy, userAgent);
    const page = await setupPage(browser, userAgent);

    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await randomDelay(1500, 3000);

    // Accept cookies
    try {
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.evaluate((el) => el.textContent?.toLowerCase() || "");
        if (text.includes("accept") || text.includes("allow") || text.includes("aceptar")) {
          await btn.click();
          await randomDelay(800, 1500);
          break;
        }
      }
    } catch {
      // ignore
    }

    await randomDelay(1000, 2000);

    // Fill username
    await humanType(page, 'input[name="username"]', creds.username);
    await randomDelay(400, 800);

    // Fill password
    await humanType(page, 'input[name="password"]', creds.password);
    await randomDelay(500, 1000);

    // Click login
    await page.click('button[type="submit"]');
    await randomDelay(3000, 5000);

    const currentUrl = page.url();

    if (currentUrl.includes("challenge") || currentUrl.includes("verify")) {
      return { success: false, error: "Requiere verificación adicional" };
    }

    if (currentUrl.includes("instagram.com") && !currentUrl.includes("login")) {
      const cookies = await page.cookies();
      const dsCookie = cookies.find((c) => c.name === "ds_user_id");
      return {
        success: true,
        cookies,
        userId: dsCookie?.value,
      };
    }

    return { success: false, error: "Login falló" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Instagram Follow User ────────────────────────────────────────────────────

export async function followInstagramUser(
  botCreds: IgCredentials,
  targetUsername: string,
  savedCookies?: Cookie[],
  userAgent?: string
): Promise<IgFollowResult> {
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser(botCreds.proxy, userAgent);
    const page = await setupPage(browser, userAgent);

    // If we have saved cookies, use them (faster, avoids login)
    if (savedCookies && savedCookies.length > 0) {
      await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
      await page.setCookie(...savedCookies);
    } else {
      // Login first
      const loginResult = await loginInstagram(botCreds, userAgent);
      if (!loginResult.success || !loginResult.cookies) {
        return { success: false, error: loginResult.error || "No se pudo iniciar sesión" };
      }
      await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
      await page.setCookie(...loginResult.cookies);
    }

    await randomDelay(1000, 2000);

    // Navigate to target user's profile
    const profileUrl = `https://www.instagram.com/${targetUsername}/`;
    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await randomDelay(2000, 4000);

    // Check if profile exists
    const notFound = await page.$('h2[class*="error"]');
    if (notFound) {
      return { success: false, error: "Usuario no encontrado" };
    }

    // Find and click Follow button
    // Instagram uses different selectors depending on version
    const followSelectors = [
      'button[class*="follow"]',
      'button:has-text("Follow")',
      'button:has-text("Seguir")',
      '[data-testid="follow-button"]',
    ];

    let followed = false;

    // Try to find follow button by text content
    const buttons = await page.$$("button");
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.textContent?.toLowerCase().trim() || "");
      if (text === "follow" || text === "seguir" || text === "follow back" || text === "seguir de vuelta") {
        await randomDelay(500, 1500);
        await btn.click();
        await randomDelay(1500, 3000);
        followed = true;
        break;
      }
    }

    if (!followed) {
      // Try CSS selectors as fallback
      for (const selector of followSelectors) {
        try {
          const btn = await page.$(selector);
          if (btn) {
            await randomDelay(500, 1500);
            await btn.click();
            await randomDelay(1500, 3000);
            followed = true;
            break;
          }
        } catch {
          // Try next selector
        }
      }
    }

    if (!followed) {
      // Try Instagram's API directly via fetch on the page
      const result = await page.evaluate(async (username: string) => {
        try {
          // Get user ID first
          const userRes = await fetch(`/api/v1/users/web_profile_info/?username=${username}`, {
            headers: { "x-ig-app-id": "936619743392459" },
          });
          const userData = await userRes.json();
          const userId = userData?.data?.user?.id;
          if (!userId) return { success: false, error: "User ID not found" };

          // Follow via API
          const followRes = await fetch(`/api/v1/friendships/create/${userId}/`, {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "x-csrftoken":
                document.cookie
                  .split(";")
                  .find((c) => c.trim().startsWith("csrftoken="))
                  ?.split("=")[1] || "",
            },
          });
          const followData = await followRes.json();
          return { success: followData.friendship_status?.following === true };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      }, targetUsername);

      if (result.success) {
        followed = true;
      }
    }

    return { success: followed, followed };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ─── Batch Follow ─────────────────────────────────────────────────────────────

export interface BatchFollowProgress {
  botId: string;
  botUsername: string;
  success: boolean;
  error?: string;
}

export async function batchFollowUser(
  bots: Array<{ id: string; username: string; email: string; password: string; proxy?: string; userAgent?: string; cookies?: string }>,
  targetUsername: string,
  onProgress?: (progress: BatchFollowProgress) => void
): Promise<{ succeeded: number; failed: number; results: BatchFollowProgress[] }> {
  const results: BatchFollowProgress[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const bot of bots) {
    // Parse saved cookies if available
    let savedCookies: Cookie[] | undefined;
    if (bot.cookies) {
      try {
        savedCookies = JSON.parse(bot.cookies) as Cookie[];
      } catch {
        savedCookies = undefined;
      }
    }

    const result = await followInstagramUser(
      {
        username: bot.username,
        email: bot.email,
        password: bot.password,
        proxy: bot.proxy,
      },
      targetUsername,
      savedCookies,
      bot.userAgent
    );

    const progress: BatchFollowProgress = {
      botId: bot.id,
      botUsername: bot.username,
      success: result.success,
      error: result.error,
    };

    results.push(progress);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(progress);
    }

    // Human-like delay between follows (30-90 seconds to avoid rate limiting)
    if (bots.indexOf(bot) < bots.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * 60000 + 30000))
      );
    }
  }

  return { succeeded, failed, results };
}

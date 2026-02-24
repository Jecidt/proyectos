import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { insertBot, getAllBots, getBotStats, DbBotAccount } from "@/lib/db";
import { registerInstagramAccount } from "@/lib/instagram";
import { SAFE_BOT_LIMITS } from "@/lib/store";

// Realistic user agents for bot simulation
const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram/303.0.0.11.113 Mobile/15E148",
  "Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram/310.0.0.0.91 Mobile/15E148",
];

// Name pools for realistic usernames
const FIRST_NAMES = [
  "sofia", "mateo", "valentina", "sebastian", "camila", "nicolas", "isabella",
  "alejandro", "daniela", "juan", "maria", "carlos", "ana", "luis", "laura",
  "jorge", "andrea", "miguel", "paula", "david", "sara", "gabriel", "lucia",
  "fernando", "elena", "roberto", "natalia", "diego", "claudia", "andres",
];
const SUFFIXES = [
  "_oficial", "_real", ".photos", "_daily", "_life", "_vibes", "_gram",
  "_pics", "_art", "_style", "_world", "_media", "_studio", "_creative",
];
const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];

function generateCredentials(proxy?: string) {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  const num = Math.floor(Math.random() * 9999);
  const igUsername = `${firstName}${suffix}${num > 100 ? num : ""}`;
  const emailBase = igUsername.replace(/[._]/g, "").toLowerCase();
  const emailNum = Math.floor(Math.random() * 999);
  const emailDomain = EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  const email = `${emailBase}${emailNum}@${emailDomain}`;
  const password =
    "Aa" +
    Math.random().toString(36).slice(2, 6) +
    Math.floor(Math.random() * 9999) +
    "!";
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  return { igUsername, email, password, userAgent };
}

// POST /api/bots/generate - Generate and register real Instagram bot accounts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quantity = Number(body.quantity);
    const proxy = body.proxy as string | undefined;
    const realRegistration = body.realRegistration !== false; // default true

    if (!quantity || quantity < 1 || quantity > SAFE_BOT_LIMITS.maxBotsPerBatch) {
      return NextResponse.json(
        {
          error: `La cantidad debe ser entre 1 y ${SAFE_BOT_LIMITS.maxBotsPerBatch} por lote (límite seguro)`,
        },
        { status: 400 }
      );
    }

    const generated: Array<{
      id: string;
      igUsername: string;
      email: string;
      status: string;
      registrationStatus: string;
      error?: string;
    }> = [];

    for (let i = 0; i < quantity; i++) {
      const creds = generateCredentials(proxy);
      const id = uuidv4();

      let registrationStatus = "pending_verification";
      let igUserId: string | undefined;
      let sessionCookies: string | undefined;
      let registrationError: string | undefined;

      if (realRegistration) {
        // Attempt real Instagram registration
        console.log(`[BotGen] Registering @${creds.igUsername} on Instagram...`);
        const result = await registerInstagramAccount(
          {
            username: creds.igUsername,
            email: creds.email,
            password: creds.password,
            proxy,
          },
          creds.userAgent
        );

        if (result.success) {
          registrationStatus = result.requiresVerification
            ? "pending_verification"
            : "available";
          igUserId = result.userId;
          if (result.cookies) {
            sessionCookies = JSON.stringify(result.cookies);
          }
          console.log(
            `[BotGen] ✅ @${creds.igUsername} registered (status: ${registrationStatus})`
          );
        } else {
          registrationStatus = "pending_verification";
          registrationError = result.error;
          console.log(
            `[BotGen] ⚠️ @${creds.igUsername} registration issue: ${result.error}`
          );
        }
      } else {
        // Simulated mode — mark as available immediately (for testing)
        registrationStatus = "available";
      }

      const bot: DbBotAccount = {
        id,
        platform: "instagram",
        ig_username: creds.igUsername,
        email: creds.email,
        password: creds.password,
        phone_number: null,
        user_agent: creds.userAgent,
        verification_status: registrationStatus === "available" ? "email_verified" : "unverified",
        created_at: new Date().toISOString(),
        last_used_at: null,
        status: registrationStatus,
        proxy: proxy || null,
        follows_today: 0,
        total_follows_delivered: 0,
        notes: registrationError ? `Reg error: ${registrationError}` : null,
        ig_user_id: igUserId || null,
        session_cookies: sessionCookies || null,
      };

      insertBot(bot);

      generated.push({
        id,
        igUsername: creds.igUsername,
        email: creds.email,
        status: registrationStatus,
        registrationStatus,
        error: registrationError,
      });

      // Delay between registrations to avoid detection
      if (i < quantity - 1 && realRegistration) {
        const delayMs = Math.floor(Math.random() * 15000 + 10000); // 10-25 seconds
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    const stats = getBotStats();

    return NextResponse.json({
      success: true,
      generated: generated.length,
      accounts: generated,
      stats: {
        totalBots: stats.total,
        availableBots: stats.available,
        deployedBots: stats.deployed,
        bannedBots: stats.banned,
      },
    });
  } catch (err) {
    console.error("[BotGen] Error:", err);
    return NextResponse.json(
      { error: "Error al generar cuentas bot" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const stats = getBotStats();
  return NextResponse.json({
    totalBots: stats.total,
    availableBots: stats.available,
    deployedBots: stats.deployed,
    bannedBots: stats.banned,
  });
}

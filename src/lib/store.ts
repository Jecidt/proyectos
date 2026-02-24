// In-memory store for JecidtSebasBoost Pro — Instagram Followers Service

export type Platform = "instagram";
export type BotStatus = "available" | "deployed" | "banned" | "pending_verification";
export type VerificationStatus = "unverified" | "email_verified" | "phone_verified" | "fully_verified";

export interface BotAccount {
  id: string;
  platform: Platform;
  igUsername: string;
  email: string;
  password: string;
  phoneNumber?: string;
  userAgent: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  lastUsedAt?: string;
  status: BotStatus;
  proxy?: string;
  followsToday: number;
  totalFollowsDelivered: number;
  notes?: string;
}

export interface FollowersPackage {
  id: string;
  name: string;
  followers: number;
  price: number; // in USD
  deliveryTime: string; // e.g. "24-48 horas"
  description: string;
  badge?: string; // e.g. "MÁS POPULAR"
  botsRequired: number; // how many bots needed to fulfill this order
}

export type OrderStatus = "pending" | "processing" | "deployed" | "delivered" | "failed";
export type PaymentMethod = "demo" | "stripe" | "crypto";

export interface Order {
  id: string;
  igUsername: string; // customer's Instagram username
  packageId: string;
  packageName: string;
  followers: number;
  price: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  deployedAt?: string;
  deliveredAt?: string;
  botsUsed: string[]; // bot account IDs used
  receiptCode: string;
  deliveryTime: string;
  notes?: string;
}

export interface StoreStats {
  totalBots: number;
  availableBots: number;
  deployedBots: number;
  bannedBots: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  totalFollowersDelivered: number;
}

// Default packages
export const PACKAGES: FollowersPackage[] = [
  {
    id: "pkg_100",
    name: "Starter",
    followers: 100,
    price: 2.99,
    deliveryTime: "12-24 horas",
    description: "Perfecto para empezar a crecer tu perfil",
    botsRequired: 2,
  },
  {
    id: "pkg_500",
    name: "Popular",
    followers: 500,
    price: 9.99,
    deliveryTime: "24-48 horas",
    description: "El más elegido por nuestros clientes",
    badge: "MÁS POPULAR",
    botsRequired: 10,
  },
  {
    id: "pkg_1000",
    name: "Influencer",
    followers: 1000,
    price: 17.99,
    deliveryTime: "48-72 horas",
    description: "Impulsa tu perfil al siguiente nivel",
    botsRequired: 20,
  },
  {
    id: "pkg_5000",
    name: "Viral",
    followers: 5000,
    price: 69.99,
    deliveryTime: "3-5 días",
    description: "Para creadores serios de contenido",
    badge: "MEJOR VALOR",
    botsRequired: 50,
  },
];

// Safe bot creation guidelines
export const SAFE_BOT_LIMITS = {
  maxBotsPerDay: 50,
  maxBotsPerBatch: 20,
  recommendedDelayMinutes: 30,
  maxFollowsPerBotPerDay: 50,
  maxFollowsPerBotPerHour: 10,
  tips: [
    "No crear más de 20 cuentas por lote para evitar detección",
    "Usar proxies residenciales o móviles diferentes para cada cuenta bot",
    "Esperar al menos 30 minutos entre lotes de creación",
    "Cada bot no debe seguir más de 50 cuentas por día",
    "Variar los tiempos de acción (no actuar en intervalos exactos)",
    "Usar nombres de usuario y fotos de perfil variados y realistas",
    "Activar 2FA en las cuentas bot para mayor seguridad",
    "No usar la misma IP para múltiples cuentas bot",
    "Rotar el User-Agent del navegador en cada sesión",
    "Simular comportamiento humano: pausas aleatorias entre acciones",
    "Verificar el correo electrónico de cada cuenta antes de usarla",
    "Mantener un inventario de cuentas listas (modelo stock) para entrega inmediata",
  ],
};

// Realistic user agents for bot simulation
const USER_AGENTS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram/303.0.0.11.113 Mobile/15E148",
  "Mozilla/5.0 (Linux; Android 13; Samsung Galaxy S23) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Instagram/310.0.0.0.91 Mobile/15E148",
];

// Global in-memory store (resets on server restart)
export const store: {
  botAccounts: BotAccount[];
  orders: Order[];
} = {
  botAccounts: [],
  orders: [],
};

// Helper to generate random strings
export function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate receipt code
export function generateReceiptCode(): string {
  const prefix = "JSB";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomString(4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Generate a single bot account
export function generateBotAccount(proxy?: string): BotAccount {
  const id = randomString(8);
  // Generate realistic-looking IG usernames
  const firstNames = ["sofia", "mateo", "valentina", "sebastian", "camila", "nicolas", "isabella", "alejandro", "daniela", "juan"];
  const suffixes = ["_oficial", "_real", ".photos", "_daily", "_life", "_vibes", "99", "2024", "_gram", "_pics"];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const num = Math.floor(Math.random() * 999);
  const igUsername = `${firstName}${suffix}${num > 100 ? num : ""}`;
  const emailDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  const email = `${igUsername.replace(/[._]/g, "")}${Math.floor(Math.random() * 99)}@${emailDomains[Math.floor(Math.random() * emailDomains.length)]}`;
  const password = randomString(8) + "Aa1!";
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  return {
    id,
    platform: "instagram",
    igUsername,
    email,
    password,
    userAgent,
    verificationStatus: "email_verified",
    createdAt: new Date().toISOString(),
    status: "available",
    proxy: proxy || undefined,
    followsToday: 0,
    totalFollowsDelivered: 0,
  };
}

// Get store stats
export function getStats(): StoreStats {
  const available = store.botAccounts.filter((b) => b.status === "available").length;
  const deployed = store.botAccounts.filter((b) => b.status === "deployed").length;
  const banned = store.botAccounts.filter((b) => b.status === "banned").length;
  const pending = store.orders.filter((o) => o.status === "pending").length;
  const processing = store.orders.filter((o) => o.status === "processing" || o.status === "deployed").length;
  const delivered = store.orders.filter((o) => o.status === "delivered").length;
  const revenue = store.orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.price, 0);
  const totalFollowers = store.orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.followers, 0);

  return {
    totalBots: store.botAccounts.length,
    availableBots: available,
    deployedBots: deployed,
    bannedBots: banned,
    totalOrders: store.orders.length,
    pendingOrders: pending,
    processingOrders: processing,
    deliveredOrders: delivered,
    totalRevenue: revenue,
    totalFollowersDelivered: totalFollowers,
  };
}

// In-memory store for Instagram Followers Service
export interface BotAccount {
  id: string;
  igUsername: string;
  email: string;
  password: string;
  createdAt: string;
  status: "available" | "deployed";
  proxy?: string;
  notes?: string;
}

export interface FollowersPackage {
  id: string;
  name: string;
  followers: number;
  price: number; // in USD
  deliveryTime: string; // e.g. "24-48 horas"
  description: string;
}

export interface Order {
  id: string;
  igUsername: string; // customer's Instagram username
  packageId: string;
  packageName: string;
  followers: number;
  price: number;
  status: "pending" | "processing" | "delivered" | "failed";
  createdAt: string;
  deliveredAt?: string;
  botsUsed: string[]; // bot account IDs used
  receiptCode: string;
}

export interface StoreStats {
  totalBots: number;
  availableBots: number;
  deployedBots: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
}

// Default packages
export const PACKAGES: FollowersPackage[] = [
  {
    id: "pkg_100",
    name: "Starter",
    followers: 100,
    price: 2.99,
    deliveryTime: "12-24 horas",
    description: "Perfecto para empezar a crecer",
  },
  {
    id: "pkg_500",
    name: "Popular",
    followers: 500,
    price: 9.99,
    deliveryTime: "24-48 horas",
    description: "El más elegido por nuestros clientes",
  },
  {
    id: "pkg_1000",
    name: "Influencer",
    followers: 1000,
    price: 17.99,
    deliveryTime: "48-72 horas",
    description: "Impulsa tu perfil al siguiente nivel",
  },
  {
    id: "pkg_5000",
    name: "Viral",
    followers: 5000,
    price: 69.99,
    deliveryTime: "3-5 días",
    description: "Para creadores serios de contenido",
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
    "Usar proxies diferentes para cada cuenta bot",
    "Esperar al menos 30 minutos entre lotes de creación",
    "Cada bot no debe seguir más de 50 cuentas por día",
    "Variar los tiempos de acción (no actuar en intervalos exactos)",
    "Usar nombres de usuario y fotos de perfil variados",
    "Activar 2FA en las cuentas bot para mayor seguridad",
    "No usar la misma IP para múltiples cuentas bot",
  ],
};

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
  const prefix = "IG";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomString(4).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Generate a single bot account
export function generateBotAccount(proxy?: string): BotAccount {
  const id = randomString(8);
  // Generate realistic-looking IG usernames
  const adjectives = ["cool", "real", "true", "best", "top", "pro", "star", "hot", "new", "big"];
  const nouns = ["user", "gram", "photo", "life", "world", "daily", "vibes", "shots", "pics", "feed"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 9999);
  const igUsername = `${adj}_${noun}${num}`;
  const email = `${igUsername}@${["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"][Math.floor(Math.random() * 4)]}`;
  const password = randomString(10) + "A1!";
  return {
    id,
    igUsername,
    email,
    password,
    createdAt: new Date().toISOString(),
    status: "available",
    proxy: proxy || undefined,
  };
}

// Get store stats
export function getStats(): StoreStats {
  const available = store.botAccounts.filter((b) => b.status === "available").length;
  const deployed = store.botAccounts.filter((b) => b.status === "deployed").length;
  const pending = store.orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const delivered = store.orders.filter((o) => o.status === "delivered").length;
  const revenue = store.orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.price, 0);

  return {
    totalBots: store.botAccounts.length,
    availableBots: available,
    deployedBots: deployed,
    totalOrders: store.orders.length,
    pendingOrders: pending,
    deliveredOrders: delivered,
    totalRevenue: revenue,
  };
}

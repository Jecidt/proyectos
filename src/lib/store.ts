// In-memory store for bot accounts and users
export interface BotAccount {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  status: "available" | "sold";
}

export interface UserAccount {
  id: string;
  username: string;
  purchasedBots: BotAccount[];
}

// Global in-memory store (resets on server restart)
export const store: {
  botAccounts: BotAccount[];
  users: UserAccount[];
} = {
  botAccounts: [],
  users: [],
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

// Generate a single bot account
export function generateBotAccount(): BotAccount {
  const id = randomString(8);
  const username = `bot_${randomString(6)}`;
  const email = `${username}@botmail.com`;
  const password = randomString(12);
  return {
    id,
    username,
    email,
    password,
    createdAt: new Date().toISOString(),
    status: "available",
  };
}

// Get or create a user
export function getOrCreateUser(username: string): UserAccount {
  let user = store.users.find((u) => u.username === username);
  if (!user) {
    user = {
      id: randomString(8),
      username,
      purchasedBots: [],
    };
    store.users.push(user);
  }
  return user;
}

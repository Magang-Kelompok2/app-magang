// src/lib/config.ts
// Single source of truth. Import this everywhere. Never call process.env directly.

interface Config {
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    maxConnections: number;
  };
  minio: {
    endpoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  server: {
    port: number;
    nodeEnv: "development" | "production" | "test";
    corsOrigin: string;
    fastapiUrl: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

class ConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
        `Set them in your .env file before starting the server.`
    );
    this.name = "ConfigError";
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new ConfigError([key]);
  }
  return value.trim();
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function optionalEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new ConfigError([`${key} (must be an integer, got: "${raw}")`]);
  }
  return parsed;
}

function validateConfig(): Config {
  const missing: string[] = [];

  function safeRequire(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
      return "";
    }
    return value.trim();
  }

  // Collect all missing at once instead of throwing on first
  const dbHost = safeRequire("DB_HOST");
  const dbUser = safeRequire("DB_USER");
  // Normalize: accept either DB_PASSWORD or DB_PASS, but DB_PASSWORD takes priority
  const dbPassword = process.env.DB_PASSWORD || process.env.DB_PASS;
  if (!dbPassword) missing.push("DB_PASSWORD");
  const dbName = safeRequire("DB_NAME");
  const minioEndpoint = safeRequire("MINIO_ENDPOINT");
  const minioAccessKey = safeRequire("MINIO_ACCESS_KEY");
  const minioSecretKey = safeRequire("MINIO_SECRET_KEY");
  const minioBucket = safeRequire("MINIO_BUCKET");

  if (missing.length > 0) {
    throw new ConfigError(missing);
  }

  const nodeEnvRaw = optionalEnv("NODE_ENV", "development");
  if (!["development", "production", "test"].includes(nodeEnvRaw)) {
    throw new ConfigError([`NODE_ENV must be development|production|test, got: "${nodeEnvRaw}"`]);
  }

  return {
    db: {
      host: dbHost,
      port: optionalEnvInt("DB_PORT", 5432),
      user: dbUser,
      password: dbPassword!,
      name: dbName,
      maxConnections: optionalEnvInt("DB_MAX_CONNECTIONS", 10),
    },
    minio: {
      endpoint: minioEndpoint,
      port: optionalEnvInt("MINIO_PORT", 9000),
      useSSL: optionalEnv("MINIO_USE_SSL", "false") === "true",
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
      bucket: minioBucket,
    },
    server: {
      port: optionalEnvInt("PORT", 3000),
      nodeEnv: nodeEnvRaw as Config["server"]["nodeEnv"],
      corsOrigin: optionalEnv("CORS_ORIGIN", "http://localhost:3000"),
      fastapiUrl: optionalEnv("FASTAPI_URL", "http://localhost:8000"),
    },
    rateLimit: {
      windowMs: optionalEnvInt("RATE_LIMIT_WINDOW_MS", 60_000),
      maxRequests: optionalEnvInt("RATE_LIMIT_MAX_REQUESTS", 20),
    },
  };
}

// Validate once at module load. If invalid, the process exits before serving requests.
let _config: Config;

try {
  _config = validateConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error("\n❌ CONFIG ERROR:\n" + err.message + "\n");
    process.exit(1);
  }
  throw err;
}

export const config = _config;

export function isProduction(): boolean {
  return config.server.nodeEnv === "production";
}
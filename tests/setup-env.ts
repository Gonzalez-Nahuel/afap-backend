import { vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/afap_test");
vi.stubEnv("REDIS_URL", "redis://127.0.0.1:6379/15");
vi.stubEnv("JWT_ACCESS_TOKEN_SECRET", "test-access-secret-long-enough");
vi.stubEnv("JWT_REFRESH_TOKEN_SECRET", "test-refresh-secret-long-enough");
vi.stubEnv("ACCESS_TOKEN_EXPIRES", "15m");
vi.stubEnv("REFRESH_TOKEN_EXPIRES", "7d");
vi.stubEnv("RESEND_API_KEY", "test-key");
vi.stubEnv("FRONTEND_URL", "http://localhost:5173");

import { UserPayload } from "@/lib/jwt";

export type ClientType = "web" | "mobile";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      clientType?: ClientType;
    }
  }
}

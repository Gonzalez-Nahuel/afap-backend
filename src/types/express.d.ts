import { UserPayload } from "@/lib/jwt";
import type { ClientInfoDTO } from "@/modules/auth/auth.dto";

export type ClientType = "web" | "mobile";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      clientType?: ClientType;
      clientInfo?: ClientInfoDTO;
    }
  }
}

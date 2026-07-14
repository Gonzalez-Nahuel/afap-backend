import { UserPayload } from "@/lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

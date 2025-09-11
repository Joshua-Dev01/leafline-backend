// src/types/express.d.ts

import { UserRole } from "../auth/models/user.model";

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
       _id: mongoose.Types.ObjectId;_id: string;
      name: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

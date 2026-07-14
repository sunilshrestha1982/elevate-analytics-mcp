declare global {
  namespace Express {
    interface Request {
      id?: string;
      auth?: {
        userId: number;
        token: string;
        authenticated: boolean;
        email?: string;
      };
      user?: {
        sub: number;
        email: string;
        googleUserId?: string;
      };
      context?: {
        requestId: string;
        startTime: number;
        userId: number;
        userEmail?: string;
        toolName?: string;
      };
    }
  }
}

export {};

export interface IOtp {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  otp: number;
  expiresAt: Date;
}

export interface IOtp {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  otp: number;
  companyName?: string;
  phoneNumber?: string;
  expiresAt: Date;
}

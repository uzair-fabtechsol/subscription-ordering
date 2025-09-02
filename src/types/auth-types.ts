// client
// first name , last name, email, password, confirm, password

// supplier
// first name , last name, email, company name, phone number password, confirm, password

// admin
// email, password

export enum UserType {
  CLIENT = "client", //CL
  SUPPLIER = "supplier", //SUP
  ADMIN = "admin", //AD
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface IUser extends Document {
  firstName: string;
  lastName?: string;
  email: string;
  password?: string;
  userType: UserType;
  companyName?: string;
  phoneNumber?: string;
  googleId?: string;
  avatar?: string;
  status: UserStatus;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  // Stripe fields
  stripeCustomerId?: string | null;
  stripeAccountId?: string | null;
}

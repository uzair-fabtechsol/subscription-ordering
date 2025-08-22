// client
// first name , last name, email, password, confirm, password

// supplier
// first name , last name, email, company name, phone number password, confirm, password

// admin
// email, password

export enum UserType {
  CLIENT = "client",
  SUPPLIER = "supplier",
  ADMIN = "admin",
}

export interface IUser extends Document {
  email: string;
  password: string;
  userType: UserType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phoneNumber?: string;
}

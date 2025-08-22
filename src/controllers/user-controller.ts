import { Request, Response } from "express";

export const signupSupplier = (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Signup supplier success",
  });
};

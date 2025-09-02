import jwt from "jsonwebtoken";
import { UserModel } from "@/models/auth-model";
import { IUser } from "@/types/auth-types";
import { CustomRequest } from "@/types/modified-requests-types";
import { AppError } from "@/utils/AppError";
import { NextFunction } from "express";
import { Types } from "mongoose";

// FUNCTION
export const restrictedTo =
  (allowedUserTypes: string[]) =>
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      // 1 : take the token out of headers
      const { authorization } = req.headers;
      const token = authorization?.startsWith("Bearer ")
        ? authorization.split(" ")[1]
        : null;

      // 2 : return error if no token exists
      if (!token) {
        return next(
          new AppError("Authorization token is missing or invalid", 401)
        );
      }

      // 3 : decode/verify token
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET ? process.env.JWT_SECRET : "this_is_wrong_secret"
      ) as { id: string };

      // 4 : get the user id from token
      const userId = decodedToken.id;

      // 5 : get user from DB
      const user = await UserModel.findById(userId);

      console.log(allowedUserTypes);
      console.log(user);

      if (!user) {
        return next(
          new AppError("The user belonging to this token no longer exists", 401)
        );
      }

      // 6 : check if user's type is in the allowed list
      if (!allowedUserTypes.includes(user.userType)) {
        return next(new AppError("You are not allowed to do this action", 403));
      }

      // 7 : attach user info to request
      req.userType = user.userType as string;
      req.user = user as IUser & { _id: Types.ObjectId };

      next();
    } catch (err: unknown) {
      return next(err);
    }
  };

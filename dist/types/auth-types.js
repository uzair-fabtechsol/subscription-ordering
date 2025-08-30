"use strict";
// client
// first name , last name, email, password, confirm, password
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserType = void 0;
// supplier
// first name , last name, email, company name, phone number password, confirm, password
// admin
// email, password
var UserType;
(function (UserType) {
    UserType["CLIENT"] = "client";
    UserType["SUPPLIER"] = "supplier";
    UserType["ADMIN"] = "admin";
})(UserType || (exports.UserType = UserType = {}));

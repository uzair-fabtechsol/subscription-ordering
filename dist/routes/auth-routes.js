"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = require("../controllers/auth-controller");
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("../utils/passport"));
const router = express_1.default.Router();
// /api/v1/users
// supplier  routes
router.post("/supplier/signup", auth_controller_1.signupSupplier);
router.get("/supplier/curr", auth_controller_1.getCurrSupplierOrCLient);
router.post("/supplier/signin", auth_controller_1.signinSupplierOrClient);
router.post("/supplier/verify", auth_controller_1.verifySupplierUsingOtp);
// client  routes
router.post("/client/signup", auth_controller_1.signupClient);
router.get("/client/curr", auth_controller_1.getCurrSupplierOrCLient);
router.post("/client/signin", auth_controller_1.signinSupplierOrClient);
router.post("/client/verify", auth_controller_1.verifyClientUsingOtp);
router.patch("/convert-client-to-supplier", (0, auth_controller_1.checkAuthUser)(["client"]), auth_controller_1.convertClientToSupplier);
// google auth routes
router.get("/google", (req, res, next) => {
    // stash userType temporarily in the state param
    const userType = req.query.userType;
    const companyName = req.query.companyName;
    const phoneNumber = req.query.phoneNumber;
    const state = userType === "supplier"
        ? `userType=supplier,companyName=${companyName},phoneNumber=${phoneNumber}`
        : `userType=client`;
    passport_1.default.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
        state,
    })(req, res, next);
});
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth`,
}), auth_controller_1.sendJwtGoogle);
exports.default = router;

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY || "re_U6ABqfPz_CgNhP97QWURJ7m9mcaggsfN4");
const sendEmail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield resend.emails.send({
            from: "onboarding@resend.dev", // default sender works out of the box
            to,
            subject,
            html,
        });
        console.log("✅ Resend email result:", result);
    }
    catch (error) {
        console.error("❌ Resend email failed:", error);
    }
});
exports.sendEmail = sendEmail;

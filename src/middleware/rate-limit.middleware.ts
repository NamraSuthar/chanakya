import { rateLimit } from "express-rate-limit"


export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "too many authentication requests. Please try again later"
    }
})


export const tokenRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "too many Token requests. Please try again later"
    }
})

export const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "too many Admin requests. Please try again later"
    }
});


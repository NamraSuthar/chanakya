import express from "express"
import "dotenv/config"
import path from "node:path"

import { errorHandler } from "./middleware/error.middleware.js"
import { getClientByClientId, updateClient } from "./controller/client.controller.js"
import { requiredAdminKey } from "./middleware/admin.middleware.js"
import { getAuthenticatePage, getSignupPage, signInUser, signUpUser } from "./controller/auth.controller.js"
import { exchangeToken, getJwks, getOpenIdConfiguration, getTokenInfo, getUserInfo } from "./controller/oidc.controller.js"
import { createClient, listClients } from "./controller/client.controller.js"
import { adminRateLimit, authRateLimit, tokenRateLimit } from "./middleware/rate-limit.middleware.js"

const app = express();
const PORT = process.env.PORT ?? 8000
const NODE_ENV = process.env.NODE_ENV ?? "development"
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? ["http://localhost:3000"]

// Security: CORS Configuration
app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin)
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Admin-Key")
    res.header("Access-Control-Allow-Credentials", "true")
    
    if (req.method === "OPTIONS") {
        return res.sendStatus(200)
    }
    next()
})

// Security: Additional Headers
app.use((req, res, next) => {
    res.header("X-Content-Type-Options", "nosniff")
    res.header("X-Frame-Options", "DENY")
    res.header("X-XSS-Protection", "1; mode=block")
    res.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    next()
})

app.use(express.json());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));
app.use(errorHandler);

app.get('/', (req, res) => {
    res.json({
        message: "Welcome to my OIDC server",
    })
})


app.get('/health', (req, res) => {
    res.json({
        message: "server is running",
        healthy: true,
    })
})
app.get("/o/authenticate", authRateLimit, getAuthenticatePage)
app.get("/signup", getSignupPage);

app.get("/.well-known/openid-configuration", getOpenIdConfiguration)
app.get("/.well-known/jwks.json", getJwks)
app.get("/o/userinfo", tokenRateLimit, getUserInfo)


app.post("/o/authenticate/sign-in", authRateLimit, signInUser);
app.post("/o/authenticate/sign-up", authRateLimit, signUpUser);
app.post("/o/token", tokenRateLimit, exchangeToken);
app.post("/o/tokeninfo", tokenRateLimit, getTokenInfo)

app.post("/clients", adminRateLimit, requiredAdminKey, createClient);
app.get("/clients", adminRateLimit, requiredAdminKey, listClients);
app.get("/clients/:clientId", adminRateLimit, requiredAdminKey, getClientByClientId);
app.patch("/clients/:clientId", adminRateLimit, requiredAdminKey, updateClient);


app.listen(PORT, () => {
    console.log(`\n✅ Server is running on port ${PORT}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🔒 CORS Origins: ${ALLOWED_ORIGINS.join(", ")}`);
    console.log(`📍 OIDC Issuer: ${process.env.ISSUER_URL ?? "Not configured"}`);
    console.log(`\n🌐 API Documentation: http://localhost:${PORT}/.well-known/openid-configuration\n`);
})

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
app.get("/.well-known/jwks.josn", getJwks)
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
    console.log(`server is runnign on ${PORT} port now`);
})

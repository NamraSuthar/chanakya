import express from "express"
import "dotenv/config"
import path from "node:path"

import { getClientByClientId, updateClient } from "./controller/client.controller.js"
import { requiredAdminKey } from "./middleware/admin.middleware.js"
import { getAuthenticatePage, getSignupPage, signInUser, signUpUser } from "./controller/auth.controller.js"
import { exchangeToken, getJwks, getOpenIdConfiguration, getTokenInfo, getUserInfo } from "./controller/oidc.controller.js"
import { createClient, listClients } from "./controller/client.controller.js"

const app = express();
const PORT = process.env.PORT ?? 8000

app.use(express.json());
app.use(express.static(path.resolve("public")));
app.use(express.urlencoded({ extended: true }));


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
app.get("/o/authenticate", getAuthenticatePage)
app.get("/signup", getSignupPage);

app.get("/.well-known/openid-configuration", getOpenIdConfiguration)
app.get("/.well-known/jwks.josn", getJwks)
app.get("/o/userinfo", getUserInfo)


app.post("/o/authenticate/sign-in", signInUser);
app.post("/o/authenticate/sign-up", signUpUser);
app.post("/o/token", exchangeToken);
app.post("/o/tokeninfo", getTokenInfo)

app.post("/clients", requiredAdminKey, createClient);
app.get("/clients", requiredAdminKey, listClients);
app.get("/clients/:clientId", requiredAdminKey, getClientByClientId);
app.patch("/clients/:clientId", requiredAdminKey, updateClient);


app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})

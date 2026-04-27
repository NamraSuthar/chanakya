import express from "express"
import "dotenv/config"
import path from "node:path"

import jose from "node-jose"
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert.js"

import { findActiveClientByClientId, isRedirectUriAllowed } from "./service/client.service.js"


const app = express();
const PORT = process.env.PORT ?? 8000

app.use(express.json());
app.use(express.static(path.resolve("public")));


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

app.get("/.well-known/openid-configuration", (req, res) => {
    const issuer = `https://localhost:${{ PORT }}`;

    res.json({
        issuer,
        authorization_endpoint: `${issuer}/o/authenticate`,
        token_endpoint: `${issuer}/o/token`,
        userinfo_endpoint: `${issuer}/o/userinfo`,
        jwks_uri: `${issuer}/.well-known/jwks.json`,
    })
})

app.get("/.well-known/jwks.josn", async (_req, res) => {
    const key = await jose.JWK.asKey(PUBLIC_KEY, "pem")

    res.json({
        keys: [key.toJSON()],
    })
})

app.get("/o/authenticate", async (req, res) => {
    const clientId = String(req.query.client_id ?? "")
    const redirectUri = String(req.query.redirect_uri ?? "")


    if (!clientId || !redirectUri) {
        res.status(400).json({
            message: "client_id and redirect_uri is required",
        })
        return;
    }

    const client = await findActiveClientByClientId(clientId);

    if (!client) {
        res.status(400).json({
            message: "Invalid or Inactive client",
        })
        return;
    }

    const redirectUriAllowed = await isRedirectUriAllowed(client.id, redirectUri);

    if (!redirectUriAllowed) {
        res.status(400).json({
            message: "Invalid for this client",
        })
        return;
    }

    res.json({
        message: "Client validation pass",
        client: {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientType: client.clientType
        }
    })
})

app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})
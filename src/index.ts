import express from "express"
import "dotenv/config"
import path from "node:path"

import jose from "node-jose"
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert.js"




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

app.get("/.well-known/jwks.josn",async (_req,res)=>{
    const key = await jose.JWK.asKey(PUBLIC_KEY,"pem")
    
    res.json({
        keys: [key.toJSON()],
    })
})


app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})
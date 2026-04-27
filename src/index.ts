import express from "express"
import "dotenv/config"
import path from "node:path"

import crypto from "node:crypto"
import jose from "node-jose"
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert.js"

import { db } from "./db/index.js"
import { eq } from "drizzle-orm"
import { usertable } from "./db/schema.js"
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

    return res.sendFile(path.resolve("public", "authenticate.html"));

})

app.post("/o/authenticate/sign-in", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400).json({
            message: "Email and password are required.",
        });
        return;
    }

    const [user] = await db
        .select()
        .from(usertable)
        .where(eq(usertable.email, email))
        .limit(1);

    if (!user || !user.password || !user.salt) {
        res.status(401).json({
            message: "Invalid email or password.",
        });
        return;
    }

    const hashedPassword = crypto
        .createHash("sha256")
        .update(password + user.salt)
        .digest("hex");

    if (hashedPassword !== user.password) {
        res.status(401).json({
            message: "Invalid email or password.",
        });
        return;
    }

    res.json({
        message: "User authenticated successfully.",
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        },
    });
});

app.get("/signup", (_req, res) => {
    return res.sendFile(path.resolve("public", "signup.html"));
});
app.post("/o/authenticate/sign-up", async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !email || !password) {
        res.status(400).json({
            message: "First name, email, and password are required.",
        });
        return;
    }

    const [existingUser] = await db
        .select()
        .from(usertable)
        .where(eq(usertable.email, email))
        .limit(1);

    if (existingUser) {
        res.status(409).json({
            message: "An account with this email already exists.",
        });
        return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = crypto
        .createHash("sha256")
        .update(password + salt)
        .digest("hex");

    const [newUser] = await db
        .insert(usertable)
        .values({
            firstName,
            lastName: lastName || null,
            email,
            password: hashedPassword,
            salt,
        })
        .returning();

    res.status(201).json({
        message: "User created successfully.",
        user: {
            id: newUser?.id,
            email: newUser?.email,
            firstName: newUser?.firstName,
            lastName: newUser?.lastName,
        },
    });
});


app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})
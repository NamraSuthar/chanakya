import express from "express"
import "dotenv/config"
import path from "node:path"

import crypto from "node:crypto"
import jose from "node-jose"
import { PRIVATE_KEY, PUBLIC_KEY } from "./utils/cert.js"

import { db } from "./db/index.js"
import { and, eq } from "drizzle-orm"
import { authorizationCodesTable, usertable, accessTokensTable, refreshTokensTable } from "./db/schema.js"
import { findActiveClientByClientId, isRedirectUriAllowed } from "./service/client.service.js"


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
    const { email, password, client_id, redirect_uri, state, nonce } = req.body;

    if (!email || !password || !client_id || !redirect_uri) {
        res.status(400).json({
            message: "Email and password are required.",
        });
        return;
    }

    const client = await findActiveClientByClientId(client_id);

    if (!client) {
        res.status(400).json({
            message: "Invalid or inactive client.",
        });
        return;
    }

    const redirectUriAllowed = await isRedirectUriAllowed(client.id, redirect_uri);

    if (!redirectUriAllowed) {
        res.status(400).json({
            message: "Invalid redirect_uri for this client.",
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

    const authorizationCode = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.insert(authorizationCodesTable).values({
        code: authorizationCode,
        clientPk: client.id,
        userPk: user.id,
        redirectUri: redirect_uri,
        scope: "openid profile email",
        nonce: typeof nonce === "string" && nonce.length > 0 ? nonce : undefined,
        expiresAt,
    })

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", authorizationCode);

    if (state) {
        callbackUrl.searchParams.set("state", state);
    }

    return res.redirect(callbackUrl.toString());
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


app.post("/o/token", async (req, res) => {
    const { code, client_id, redirect_uri, client_secret, grant_type } = req.body;

    if (
        !code ||
        !client_id ||
        !redirect_uri ||
        !client_secret ||
        grant_type !== "authorization_code"
    ) {
        res.status(400).json({
            message: "token route me error hai, lagta hai req body me se koi cheej reh gai hai"
        })
        return;
    }


    const client = await findActiveClientByClientId(client_id);

    if (!client) {
        res.status(400).json({
            message: "Invalid or inactive client.",
        });
        return;
    }

    if (!client.clientSecret || client.clientSecret !== client_secret) {
        res.status(401).json({
            message: "Invalid client credentials.",
        });
        return;
    }

    const [authorizationCode] = await db
        .select()
        .from(authorizationCodesTable)
        .where(
            and(
                eq(authorizationCodesTable.code, code),
                eq(authorizationCodesTable.clientPk, client.id),
            ),
        )
        .limit(1);

    if (!authorizationCode) {
        res.status(400).json({
            message: "Invalid authorization code.",
        });
        return;
    }

    if (authorizationCode.redirectUri !== redirect_uri) {
        res.status(400).json({
            message: "redirect_uri does not match the authorization request.",
        });
        return;
    }

    if (authorizationCode.consumedAt) {
        res.status(400).json({
            message: "Authorization code has already been used.",
        });
        return;
    }


    if (authorizationCode.expiresAt.getTime() < Date.now()) {
        res.status(400).json({
            message: "Authorization code has expired.",
        });
        return;
    }


    await db
        .update(authorizationCodesTable)
        .set({
            consumedAt: new Date(),
        })
        .where(eq(authorizationCodesTable.id, authorizationCode.id));

    const accessToken = crypto.randomBytes(32).toString("hex");
    const refreshToken = crypto.randomBytes(32).toString("hex");

    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(accessTokensTable).values({
        token: accessToken,
        clientPk: client.id,
        userPk: authorizationCode.userPk,
        scope: authorizationCode.scope || "openid profile email",
        expiresAt: accessTokenExpiresAt,
    });

    await db.insert(refreshTokensTable).values({
        token: refreshToken,
        clientPk: client.id,
        userPk: authorizationCode.userPk,
        scope: authorizationCode.scope || "openid profile email",
        expiresAt: refreshTokenExpiresAt,
    });

    res.json({
        token_type: "Bearer",
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        scope: authorizationCode.scope || "openid profile email",
    });
})

app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})
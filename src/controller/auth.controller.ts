import path from "node:path"
import crypto from "node:crypto"
import bcrypt from "bcrypt"
import { and, eq } from "drizzle-orm"

import { db } from "../db/index.js"
import { usertable, authorizationCodesTable } from "../db/schema.js"
import type { Request, Response } from "express"
import { findActiveClientByClientId, isRedirectUriAllowed } from "../service/client.service.js"


export function getSignupPage(_req: Request, res: Response) {
    return res.sendFile(path.resolve("public", "dignup.html"))
}

export async function getAuthenticatePage(req: Request, res: Response) {
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
}

export async function signUpUser(req: Request, res: Response) {

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
        .insert(usertable)
        .values({
            firstName,
            lastName: lastName || null,
            email,
            password: hashedPassword,
            salt:null,
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
}

export async function signInUser(req: Request, res: Response) {
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

    if (!user || !user.password ) {
        res.status(401).json({
            message: "Invalid email or password.",
        });
        return;
    }

    const passwordMatches = await bcrypt.compare(password, user.password)

    if (!passwordMatches) {
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

}


import { type Request, type Response } from "express"
import "dotenv/config"
import path from "node:path"
import bcrypt from "bcrypt"
import crypto from "node:crypto"
import { exportJWK, importSPKI } from "jose"
import JWT from "jsonwebtoken"

import { PRIVATE_KEY, PUBLIC_KEY } from "./../utils/cert.js"
import type { JWTClaims } from "./../utils/user-token.js"  //Use this when importing only types (like interface or type aliases) to ensure they are completely erased during compilation and do not pollute the runtime namespace
import { db } from "./../db/index.js"
import { and, eq } from "drizzle-orm"
import { findActiveClientByClientId, isRedirectUriAllowed } from "../service/client.service.js"
import { authorizationCodesTable, usertable, accessTokensTable, refreshTokensTable } from "./../db/schema.js"

function toBase64Url(buffer: Buffer) {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function generateS256Challenge(codeVerifier: string) {
    return toBase64Url(
        crypto.createHash("sha256").update(codeVerifier).digest(),
    );
}




export function getOpenIdConfiguration(_req: Request, res: Response) {

    const issuer = process.env.ISSUER_URL;

    if (!issuer) {
        res.status(500).json({
            message: "issuer url is not configured ",
        })
    }

    res.json({
        issuer,
        authorization_endpoint: `${issuer}/o/authenticate`,
        token_endpoint: `${issuer}/o/token`,
        userinfo_endpoint: `${issuer}/o/userinfo`,
        jwks_uri: `${issuer}/.well-known/jwks.josn`,
    })
}

export async function getJwks(_req: Request, res: Response) {

    const publicKey = await importSPKI(PUBLIC_KEY.toString(), "RS256")
    const jwk = await exportJWK(publicKey)

    res.json({
        keys:
        {
            ...jwk,
            use: "sig",
            alg: "RS256",
            kid: "mian-key",
        }

    })

}

export async function exchangeToken(req: Request, res: Response) {

    const {
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type,
        refresh_token,
        code_verifier,
    } = req.body;

    if (!client_id || !client_secret || !grant_type) {
        res.status(400).json({
            message: "client_id, client_secret, and grant_type are required.",
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

    if (!client.clientSecret) {
        res.status(401).json({
            message: "Invalid client credentials.",
        });
        return;
    }

    const clientSecretMatches = await bcrypt.compare(
        client_secret,
        client.clientSecret,
    );

    if (!clientSecretMatches) {
        res.status(401).json({
            message: "Invalid client credentials.",
        });
        return;
    }

    if (grant_type === "authorization_code") {
        if (!code || !redirect_uri) {
            res.status(400).json({
                message: "code and redirect_uri are required.",
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
        if (authorizationCode.codeChallenge) {
            if (!code_verifier) {
                res.status(400).json({
                    message: "code_verifier is required for this authorization code.",
                });
                return;
            }

            if (authorizationCode.codeChallengeMethod !== "S256") {
                res.status(400).json({
                    message: "Unsupported code_challenge_method.",
                });
                return;
            }

            const computedChallenge = generateS256Challenge(code_verifier);

            if (computedChallenge !== authorizationCode.codeChallenge) {
                res.status(400).json({
                    message: "Invalid code_verifier.",
                });
                return;
            }
        }

        await db
            .update(authorizationCodesTable)
            .set({
                consumedAt: new Date(),
            })
            .where(eq(authorizationCodesTable.id, authorizationCode.id));

        const [user] = await db
            .select()
            .from(usertable)
            .where(eq(usertable.id, authorizationCode.userPk))
            .limit(1);

        if (!user) {
            res.status(404).json({
                message: "User not found.",
            });
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        const issuer = process.env.ISSUER_URL;
        if (!issuer) {
            res.status(500).json({
                message: "issuer URL is not configured!"
            })
            return;
        }
        
        const claims: JWTClaims = {
            iss: issuer,
            sub: user.id,
            email: user.email ?? "",
            email_verified: user.emailVerified,
            exp: now + 3600,
            iat: now,
            given_name: user.firstName || "",
            family_name: user.lastName || undefined,
            name: [user.firstName, user.lastName].filter(Boolean).join(" "),
            aud: client.clientId,
        };

        const accessToken = JWT.sign(claims, PRIVATE_KEY, {
            algorithm: "RS256",
        });

        const refreshToken = crypto.randomBytes(32).toString("hex");

        const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const refreshTokenExpiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
        );

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
        return;
    }

    if (grant_type === "refresh_token") {
        if (!refresh_token) {
            res.status(400).json({
                message: "refresh_token is required.",
            });
            return;
        }

        const [storedRefreshToken] = await db
            .select()
            .from(refreshTokensTable)
            .where(
                and(
                    eq(refreshTokensTable.token, refresh_token),
                    eq(refreshTokensTable.clientPk, client.id),
                ),
            )
            .limit(1);

        if (!storedRefreshToken) {
            res.status(400).json({
                message: "Invalid refresh token.",
            });
            return;
        }

        if (storedRefreshToken.revokedAt) {
            res.status(400).json({
                message: "Refresh token has been revoked.",
            });
            return;
        }

        if (storedRefreshToken.expiresAt.getTime() < Date.now()) {
            res.status(400).json({
                message: "Refresh token has expired.",
            });
            return;
        }

        const [user] = await db
            .select()
            .from(usertable)
            .where(eq(usertable.id, storedRefreshToken.userPk))
            .limit(1);

        if (!user) {
            res.status(404).json({
                message: "User not found.",
            });
            return;
        }

        const now = Math.floor(Date.now() / 1000);

        const claims: JWTClaims = {
            iss: `http://localhost:${process.env.PORT ?? "8000"}`,
            sub: user.id,
            email: user.email ?? "",
            email_verified: user.emailVerified,
            exp: now + 3600,
            iat: now,
            given_name: user.firstName || "",
            family_name: user.lastName || undefined,
            name: [user.firstName, user.lastName].filter(Boolean).join(" "),
            aud: client.clientId,
        };

        const newAccessToken = JWT.sign(claims, PRIVATE_KEY, {
            algorithm: "RS256",
        });
        const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const newRefreshToken = crypto.randomBytes(32).toString("hex");
        const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await db.insert(accessTokensTable).values({
            token: newAccessToken,
            clientPk: client.id,
            userPk: user.id,
            scope: storedRefreshToken.scope || "openid profile email",
            expiresAt: accessTokenExpiresAt,
        });

        await db
            .update(refreshTokensTable)
            .set({
                revokedAt: new Date(),
            })
            .where(eq(refreshTokensTable.id, storedRefreshToken.id));

        await db.insert(refreshTokensTable).values({
            token: newRefreshToken,
            clientPk: client.id,
            userPk: user.id,
            scope: storedRefreshToken.scope || "openid profile email",
            expiresAt: refreshTokenExpiresAt,
            rotatedFromTokenPk: storedRefreshToken.id,
        });

        res.json({
            token_type: "Bearer",
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_in: 3600,
            scope: storedRefreshToken.scope || "openid profile email",
        });
        return;
    }

    res.status(400).json({
        message: "Unsupported grant_type.",
    });

}

export async function getUserInfo(req: Request, res: Response) {

    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.json({
            message: "Missing or Invalid Authorization header",
        });
        return;
    }

    const token = authHeader.slice(7);//remover bearer

    let claims: JWTClaims;

    try {
        claims = JWT.verify(token, PUBLIC_KEY, {
            algorithms: ["RS256"]
        }) as JWTClaims;
    } catch {
        res.status(401).json({
            message: "Invalid or expired token"
        })
        return;
    }


    const [user] = await db.select().from(usertable).where(eq(usertable.id, claims.sub)).limit(1);

    if (!user) {
        res.status(404).json({
            message: "user not found",
        })
        return;
    }

    res.json({
        sub: user.id,
        email: user.email,
        email_verified: user.emailVerified,
        given_name: user.firstName,
        family_name: user.lastName,
        name: [user.firstName, user.lastName].filter(Boolean).join(" "),
        picture: user.profileImageURL,
    })

}

export async function getTokenInfo(req: Request, res: Response) {
    const { token } = req.body


    if (!token) {
        res.status(400).json({
            message: "Token is required",
        })
        return;
    }

    let claims: JWTClaims

    try {
        claims = JWT.verify(token, PUBLIC_KEY, {
            algorithms: ["RS256"]
        }) as JWTClaims
    }
    catch {
        res.status(401).json({
            message: "Invalid or expired token"
        })
        return;
    }

    const [user] = await db.select()
        .from(usertable)
        .where(eq(usertable.id, claims.sub)).limit(1);

    if (!user) {
        res.status(404).json({
            message: "user not found!"
        })
    }

    res.json({
        active: true,
        iss: claims.iss,
        sub: claims.sub,
        aud: claims.aud,
        email: claims.email,
        email_verified: claims.email_verified,
        given_name: claims.given_name,
        family_name: claims.family_name,
        name: claims.name,
        exp: claims.exp,
        iat: claims.iat,
    });

}


import bcrypt from "bcrypt"
import crypto from "node:crypto";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm"
import { db } from "../db/index.js";
import {
    clientRedirectUrisTable,
    clienttable,
} from "../db/schema.js";





export async function createClient(req: Request, res: Response) {
    const { name, clientType, redirectUris } = req.body;

    if (
        !name ||
        !clientType ||
        !Array.isArray(redirectUris) ||
        redirectUris.length === 0
    ) {
        res.status(400).json({
            message: "name, clientType, and at least one redirect URI are required.",
        });
        return;
    }

    const clientId = crypto.randomBytes(16).toString("hex");
    const rawClientSecret =
        clientType === "confidential"
            ? crypto.randomBytes(32).toString("hex")
            : null;

    const hashedClientSecret = rawClientSecret
        ? await bcrypt.hash(rawClientSecret, 10)
        : null;


    const [client] = await db
        .insert(clienttable)
        .values({
            name,
            clientId,
            clientSecret: hashedClientSecret,
            clientType,
            isActive: true,
        })
        .returning();

    if (!client) {
        res.status(500).json({
            message: "Failed to create client.",
        });
        return;
    }

    const redirectUriRows = redirectUris.map((redirectUri: string) => ({
        clientPk: client.id,
        redirectUri,
    }));

    await db.insert(clientRedirectUrisTable).values(redirectUriRows);

    res.status(201).json({
        message: "Client registered successfully.",
        client: {
            id: client.id,
            name: client.name,
            clientId: client.clientId,
            clientSecret: rawClientSecret,
            clientType: client.clientType,
            redirectUris,
        },
    });
}

export async function listClients(_req: Request, res: Response) {
    const clients = await db.select().from(clienttable);

    res.json({
        clients,
    });
}

export async function getClientByClientId(req: Request, res: Response) {

    const clientIdRaw = req.params.clientId;
    if (!clientIdRaw || Array.isArray(clientIdRaw)) {
        res.status(400).json({ message: "Invalid clientId." });
        return;
    }

    const clientIdFromRaw = clientIdRaw;

    const [client] = await db
        .select()
        .from(clienttable)
        .where(eq(clienttable.clientId, clientIdFromRaw))
        .limit(1);

    if (!client) {
        res.status(404).json({
            message: "Client not found.",
        });
        return;
    }

    const redirectUris = await db
        .select()
        .from(clientRedirectUrisTable)
        .where(eq(clientRedirectUrisTable.clientPk, client.id));

    res.json({
        client: {
            ...client,
            redirectUris: redirectUris.map((item) => item.redirectUri),
        },
    });
}

export async function updateClient(req: Request, res: Response) {
    const clientIdRaw = req.params.clientId;
    const { name, isActive, redirectUris } = req.body;

    if (!clientIdRaw || Array.isArray(clientIdRaw)) {
        res.status(400).json({ message: "Invalid clientId." });
        return;
    }

    const [client] = await db
        .select()
        .from(clienttable)
        .where(eq(clienttable.clientId, clientIdRaw))
        .limit(1);

    if (!client) {
        res.status(404).json({
            message: "Client not found.",
        });
        return;
    }

    if (name !== undefined || isActive !== undefined) {
        await db
            .update(clienttable)
            .set({
                name: name ?? client.name,
                isActive: isActive ?? client.isActive,
            })
            .where(eq(clienttable.id, client.id));
    }

    if (Array.isArray(redirectUris)) {
        await db
            .delete(clientRedirectUrisTable)
            .where(eq(clientRedirectUrisTable.clientPk, client.id));

        if (redirectUris.length > 0) {
            await db.insert(clientRedirectUrisTable).values(
                redirectUris.map((redirectUri: string) => ({
                    clientPk: client.id,
                    redirectUri,
                })),
            );
        }
    }

    const [updatedClient] = await db
        .select()
        .from(clienttable)
        .where(eq(clienttable.id, client.id))
        .limit(1);

    const updatedRedirectUris = await db
        .select()
        .from(clientRedirectUrisTable)
        .where(eq(clientRedirectUrisTable.clientPk, client.id));

    res.json({
        message: "Client updated successfully.",
        client: {
            ...updatedClient,
            redirectUris: updatedRedirectUris.map((item) => item.redirectUri),
        },
    });
}

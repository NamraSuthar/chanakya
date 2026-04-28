import crypto from "node:crypto";
import type { Request, Response } from "express";

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
  const clientSecret =
    clientType === "confidential"
      ? crypto.randomBytes(32).toString("hex")
      : null;

  const [client] = await db
    .insert(clienttable)
    .values({
      name,
      clientId,
      clientSecret,
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
      clientSecret: client.clientSecret,
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

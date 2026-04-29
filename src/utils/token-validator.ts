/**
 * Check if token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
}

/**
 * Check if authorization code is valid and not expired
 */
export function validateAuthorizationCode(authCode: any): boolean {
    if (!authCode || !authCode.code) {
        return false;
    }

    // Check if already consumed
    if (authCode.consumedAt) {
        return false;
    }

    // Check if expired
    if (isTokenExpired(authCode.expiresAt)) {
        return false;
    }

    return true;
}

/**
 * Check if access token is valid and not expired
 */
export function validateAccessToken(token: any): boolean {
    if (!token || !token.token) {
        return false;
    }

    if (isTokenExpired(token.expiresAt)) {
        return false;
    }

    return true;
}

/**
 * Check if refresh token is valid and not expired
 */
export function validateRefreshToken(token: any): boolean {
    if (!token || !token.token) {
        return false;
    }

    if (isTokenExpired(token.expiresAt)) {
        return false;
    }

    return true;
}

/**
 * Calculate remaining time until expiration (in seconds)
 */
export function getTokenTimeRemaining(expiresAt: Date): number {
    const now = new Date();
    const remaining = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000));
}

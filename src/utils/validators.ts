
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


export function validatePassword(password: string): boolean {
    return password.length >= 8;
}


export function validateRedirectUri(uri: string): boolean {
    try {
        new URL(uri);
        return true;
    } catch {
        return false;
    }
}

export function validateClientId(clientId: string): boolean {
    const clientIdRegex = /^[a-zA-Z0-9-]{3,100}$/;
    return clientIdRegex.test(clientId);
}

export function validateStringParam(param: any): param is string {
    return typeof param === "string" && param.length > 0 && !Array.isArray(param);
}

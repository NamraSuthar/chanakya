import type {
    Request,
    Response,
    NextFunction
} from "express"

interface AppError extends Error {
    status?: number;
    message: string;
}

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error("Error:", error);

    // Handle known application errors
    if (error instanceof Error) {
        const appError = error as AppError;

        // Database errors
        if (appError.message.includes("DATABASE_URL")) {
            return res.status(500).json({
                error: "Server misconfigured",
                message: "Database connection failed",
            });
        }

        // Validation errors
        if (appError.message.includes("Invalid") || appError.message.includes("Required")) {
            return res.status(400).json({
                error: "Validation Error",
                message: appError.message,
            });
        }

        // Authentication errors
        if (appError.message.includes("Unauthorized") || appError.message.includes("Invalid credentials")) {
            return res.status(401).json({
                error: "Authentication Error",
                message: appError.message,
            });
        }

        // JSON parse errors
        if (appError instanceof SyntaxError) {
            return res.status(400).json({
                error: "Bad Request",
                message: "Invalid JSON in request body",
            });
        }

        // Generic error handler
        return res.status(appError.status || 500).json({
            error: appError.message || "Internal Server Error",
        });
    }

    // Handle unknown error types
    res.status(500).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
    });
}
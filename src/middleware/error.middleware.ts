import type {
    Request,
    Response,
    NextFunction
} from "express"

export function errorHandler(
 error: unknown,
 _req:Request,
 res: Response,
 _next: NextFunction
){
    console.error("Unknown Error:", error)

    res.status(500).json({
        message: "Internal Server Error",
    })
}
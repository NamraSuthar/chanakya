import { Request, Response, NextFunction} from "express"
import "dotenv/config"

export function requiredAdminKey( req: Request, res: Response
    , next: NextFunction
){
    const providedKey = req.header("x-admin-api-key");
    const expectedKey = process.env.ADMIN_API_KEY

    if(!expectedKey){
        res.status(500).json({
            message:"admin key is not configured",
        })
        return;
    }

    if(!providedKey || providedKey !== expectedKey){
        res.status(403).json({
            message:"Forbiden!"
        })
        return
    }

    next()
}

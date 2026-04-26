import express from "express"
import "dotenv/config"


const app = express();
const PORT = process.env.PORT ?? 8000

app.use(express.json());


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

app.listen(PORT, () => {
    console.log(`server is runnign on ${PORT} port now`);
})
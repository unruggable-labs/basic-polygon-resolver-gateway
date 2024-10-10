import express, { Request, Response, NextFunction } from "express";
import serverAdapter from "./server-adapter";
import { JsonRpcProvider } from "ethers";
import cors from "cors";

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to handle OPTIONS requests
app.options("*", (_req: Request, res: Response) => {
  res.sendStatus(200);
});

//Modify these values to run the gateway
const provider = new JsonRpcProvider(process.env.RPC_URL);
const l2RegistryResolverAddress = process.env.REGISTRY_ADDRESS as string;
console.log("Using provider:", provider);
console.log("REGISTRY_ADDRESS", l2RegistryResolverAddress);
const builtAdapter = serverAdapter(provider, l2RegistryResolverAddress);

// Bind our adapter to the root path
// Bind our adapter to the root path
app.use("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Create a new Request object from the Express request
    const request = new Request(req.url, {
      method: req.method,
      headers: req.headers as HeadersInit,
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Call the adapter with the correct input shape
    const response = await builtAdapter({ request });

    res
      .status(response.status)
      .set(Object.fromEntries(response.headers))
      .send(await response.text());
  } catch (error) {
    next(error);
  }
});

app.listen(4000, () => {
  console.log("Running the server at http://localhost:4000/");
});

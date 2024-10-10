import express from "express";
import serverAdapter from "./server-adapter";
import { JsonRpcProvider } from "ethers";
import cors from "cors";

const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to handle OPTIONS requests
app.options("*", (req, res) => {
  res.sendStatus(200);
});

//Modify these values to run the gateway
const provider = new JsonRpcProvider(process.env.RPC_URL);
const l2RegistryResolverAddress = process.env.REGISTRY_ADDRESS as string;
console.log("Using provider:", provider);
console.log("REGISTRY_URL", l2RegistryResolverAddress);
const builtAdapter = serverAdapter(provider, l2RegistryResolverAddress);

// Bind our adapter to `/mypath` endpoint
app.use("/", builtAdapter);

app.listen(4000, () => {
  console.log("Running the server at http://localhost:4000/");
});

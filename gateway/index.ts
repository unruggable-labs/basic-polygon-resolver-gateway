/// @title Basic X-Chain express gateway for ENS
/// @author clowes.eth
/// @company Unruggable
import express from 'express'
import serverAdapter from './server-adapter'
import { JsonRpcProvider } from 'ethers';

const app = express()

const provider = new JsonRpcProvider(process.env.RPC_URL);
const l2RegistryResolverAddress = process.env.REGISTRY_ADDRESS as string;
console.log("Using provider:", provider);
console.log("REGISTRY_ADDRESS", l2RegistryResolverAddress);

const builtAdapter = serverAdapter(provider, l2RegistryResolverAddress);

app.use('/', builtAdapter)

const PORT = process.env.EXPRESS_GATEWAY_PORT || 4000;
app.listen(PORT, () => {
  console.log(`Running the server at http://localhost:${PORT}/`)
})
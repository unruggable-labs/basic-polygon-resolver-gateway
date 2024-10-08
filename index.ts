import express from 'express'
import serverAdapter from './server-adapter'
import { JsonRpcProvider } from 'ethers';

const app = express()

//Modify these values to run the gateway
const YOUR_INFURA_KEY = '';
const provider = new JsonRpcProvider(`https://mainnet.infura.io/v3/${YOUR_INFURA_KEY}`);
const l2RegistryResolverAddress = '0x5F08e685c6E28b0c9b9dA02EC4c277e976315AD2';

const builtAdapter = serverAdapter(provider, l2RegistryResolverAddress);

// Bind our adapter to `/mypath` endpoint
app.use('/', builtAdapter)

app.listen(4000, () => {
  console.log('Running the server at http://localhost:4000/')
})
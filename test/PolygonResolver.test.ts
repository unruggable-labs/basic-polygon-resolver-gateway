/// @author clowes.eth
/// Tests end to end resolution of this simple cross chain resolver solution
/// Runs the basic gateway, deploys both contracts to a fork of L1 (for simplicity)
/// In reality NFTRegistry would be deployed to L2
/// Sets records for the subname
/// Hijacks the resolvers for two 2LDs
/// Demonstrates that they both resolve to the save address/avatar values

import { Foundry } from '@adraffy/blocksmith';
import {toBeHex, namehash, Contract, keccak256, toUtf8Bytes, AbiCoder} from 'ethers';
import serverAdapter from '../server-adapter'

const NAME_TO_TEST = 'unruggable.eth';
const SECOND_NAME_TO_TEST = 'clowes.eth';
const SUBNAME_LABEL = "testing"
const SUBNAME_TO_TEST = `${SUBNAME_LABEL}.${NAME_TO_TEST}`;
const SECOND_SUBNAME_TO_TEST = `${SUBNAME_LABEL}.${SECOND_NAME_TO_TEST}`;
const ENS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const NODE = namehash(NAME_TO_TEST);
const SECOND_NODE = namehash(SECOND_NAME_TO_TEST);
const SLOT = 60601141082547231979268860900333162681388392465144339028714319362951386123570n

/*
// Slot generation
const defaultCoder = AbiCoder.defaultAbiCoder();
const encodedKey = defaultCoder.encode(["bytes32", "uint256"], [SECOND_NODE, 0]);
const baseSlot = keccak256(encodedKey);
const resolverSlot = BigInt(baseSlot) + 1n
console.log("resolverSlot", resolverSlot);
process.exit();
*/

const SECOND_SLOT = 87071186389396449722442602571067717484874720571345030057314163563846503330911n

const YOUR_INFURA_KEY = '';

const foundry = await Foundry.launch({
    fork: `https://mainnet.infura.io/v3/${YOUR_INFURA_KEY}`,
    procLog  : true,
    infoLog  : true,
});
  
const deployerWallet = foundry.wallets.admin;
    
const resolver = await foundry.deploy({
  file: `PolygonResolver`,
  args: ["http://127.0.0.1:4000"],
});

const registry = await foundry.deploy({
  file: `NFTRegistry`,
  args: [
    "gon.id",
    "GONID",
    "https://gon.id/",
  ],
});

const COIN_TYPE_ETH = 60;
const labelhash = keccak256(toUtf8Bytes(SUBNAME_LABEL));

await foundry.confirm(registry.addRegistrar(deployerWallet.address));
await foundry.confirm(registry.register(SUBNAME_LABEL, deployerWallet.address, 1886161968));
await foundry.confirm(registry.setAddr(labelhash, COIN_TYPE_ETH, deployerWallet.address));
await foundry.confirm(registry.setText(labelhash, "avatar", "eip155:1/erc1155:0xb32979486938aa9694bfc898f35dbed459f44424/10063"));

const builtAdapter = serverAdapter(foundry.provider, registry.target);

Bun.serve({
  port: 4000,
  fetch(req) {
    return builtAdapter.handle(req);
  },
});

// Replace unruggable.eth AND clowes.eth resolver with our test resolver
// Note we only set it on the base name, NOT subnames
await foundry.provider.send('anvil_setStorageAt', [
  ENS,
  toBeHex(SLOT, 32),
  toBeHex(resolver.target, 32),
]);
await foundry.provider.send('anvil_setStorageAt', [
  ENS,
  toBeHex(SECOND_SLOT, 32),
  toBeHex(resolver.target, 32),
]);
  
const ens = new Contract(
  ENS,
  ['function resolver(bytes32 node) view returns (address)'],
  foundry.provider
);
  
console.log(`Hijacked ${NAME_TO_TEST}: `, await ens.resolver(NODE));
console.log(`Hijacked ${SECOND_NAME_TO_TEST}:`, await ens.resolver(SECOND_NODE));

async function resolve(name: string) {
  const resolver = await foundry.provider.getResolver(name);
    
  if (!resolver) throw new Error('bug');

    console.log("Supports wildcard? ", await resolver.supportsWildcard());

    const [address, avatar] = await Promise.all([
      resolver.getAddress(),
      resolver.getText('avatar'),
    ]);
    console.log({
      name,
      address,
      avatar
    });
  }
  
  await resolve(SUBNAME_TO_TEST);
  await resolve(SECOND_SUBNAME_TO_TEST);

  await foundry.shutdown();
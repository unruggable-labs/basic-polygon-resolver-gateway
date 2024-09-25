import { Foundry } from '@adraffy/blocksmith';
import {toBeHex, namehash, Contract} from 'ethers';

const NAME_TO_TEST = 'unruggable.eth';
const ENS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const NODE = namehash(NAME_TO_TEST);
const SLOT = 60601141082547231979268860900333162681388392465144339028714319362951386123570n

const foundry = await Foundry.launch({
    fork: "https://mainnet.infura.io/v3/your-infura-key",
    procLog  : true,
    infoLog  : true,
});
  
const deployerWallet = foundry.wallets.admin;
    
const resolver = await foundry.deploy({
    file: `PolygonResolver`,
    args: ["http://localhost:4000"],
});


// Replace unruggable.eth resolver with our test resolver
// Note we only set it on the base name, NOT subnames
await foundry.provider.send('anvil_setStorageAt', [
  ENS,
  toBeHex(SLOT, 32),
  toBeHex(resolver.target, 32),
]);
  
const ens = new Contract(
  ENS,
  ['function resolver(bytes32 node) view returns (address)'],
  foundry.provider
);
  
console.log('Hijacked:', await ens.resolver(NODE));


async function resolve(name: string) {
  const resolver = await foundry.provider.getResolver(name);
    
  if (!resolver) throw new Error('bug');

    console.log("Supports wildcard? ", await resolver.supportsWildcard());

    const [address, avatar, contenthash] = await Promise.all([
      resolver.getAddress(),
      resolver.getText('avatar'),
      resolver.getContentHash(),
    ]);
    console.log({
      name,
      address,
      avatar,
      contenthash
    });
  }
  
  await resolve(NAME_TO_TEST);

  await foundry.shutdown();
import type { Foundry } from "@adraffy/blocksmith";
import type { Record } from "@resolverworks/ezccip";
import { id as keccakStr } from "ethers";

export async function deployDemo(foundry: Foundry) {
	const nft = await foundry.deploy({
		file: "NFTRegistry",
		args: ["Test", "TEST", "https://"],
	});

	const registrar = await foundry.deploy(`
		import "@src/NFTRegistry.sol";
		contract Registrar {
			function register(string memory label) external {
				NFTRegistry(${nft.target}).register(label, msg.sender, uint64(block.timestamp + 365 * 86400));
			}
		}	
	`);

	await foundry.confirm(nft.addRegistrar(registrar));

	function fetchRecord(label: string): Record {
		const token = keccakStr(label);
		return {
			text(key) {
				return nft.text(token, key);
			},
			addr(type) {
				return nft.addr(token, type);
			},
			contenthash() {
				return nft.contenthash(token);
			},
		};
	}

	return { nft, registrar, fetchRecord };
}

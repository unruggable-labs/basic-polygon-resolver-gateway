import type { Foundry } from "@adraffy/blocksmith";
import type { Record } from "@resolverworks/ezccip";
import { id as keccakStr } from "ethers";

export async function deployDemo(foundry: Foundry) {
	const registry = await foundry.deploy({
		file: "NFTRegistry",
		args: ["Test", "TEST", "https://"],
	});

	const registrar = await foundry.deploy(`
		import "@src/NFTRegistry.sol";
		contract Registrar {
			function register(string memory label) external {
				NFTRegistry(${registry.target}).register(label, msg.sender, uint64(block.timestamp + 365 * 86400));
			}
		}	
	`);

	await foundry.confirm(registry.addRegistrar(registrar));

	function fetchRecord(label: string): Record {
		const token = keccakStr(label);
		return {
			text(key) {
				return registry.text(token, key);
			},
			addr(type) {
				return registry.addr(token, type);
			},
			contenthash() {
				return registry.contenthash(token);
			},
		};
	}

	return { registry, registrar, fetchRecord };
}

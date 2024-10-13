import { serve } from "@resolverworks/ezccip/serve";
import { Foundry } from "@adraffy/blocksmith";
import { deployDemo } from "./deploy-demo.js";
import { test, expect, afterEach } from "bun:test";
import { EnsResolver, id, toBeHex } from "ethers";

function after(fn: () => Promise<void>) {
	let p: ReturnType<typeof fn> | undefined;
	afterEach(() => (p ??= fn()));
}

async function deploy() {
	const foundry = await Foundry.launch({ infoLog: false });
	after(() => foundry.shutdown());

	const { registry, registrar, fetchRecord } = await deployDemo(foundry);

	const ccip = await serve(async (name) => fetchRecord(name), {
		protocol: "ens",
	});
	after(ccip.shutdown);

	const resolver = await foundry.deploy({ file: "PolygonResolver" });
	await foundry.confirm(resolver.setGatewayURLs([ccip.endpoint]));
	await foundry.confirm(resolver.setSigner(ccip.signer, true));

	return {
		foundry,
		ccip,
		registry,
		registrar,
		resolver,
		record: fetchRecord,
	};
}

async function register(name: string) {
	const a = await deploy();
	const owner = await a.foundry.ensureWallet(name);
	await a.foundry.confirm(a.registrar.connect(owner).register(name)); // mint from owners wallet
	const labelhash = id(name);
	const resolver = new EnsResolver(
		a.foundry.provider,
		a.resolver.target,
		name
	);
	const registry = a.registry.connect(owner); // bind the registry to the owners wallet
	return { ...a, registry, resolver, labelhash, name };
}

test("addr()", async () => {
	const a = await register("raffy");
	expect(await a.resolver.getAddress()).toEqual(
		a.foundry.wallets[a.name].address
	);
});

test(`text("bio")`, async () => {
	const a = await register("chonk");
	const value = "CHONK!!!";
	await a.foundry.confirm(a.registry.setText(a.labelhash, "bio", value));
	expect(await a.resolver.getText("bio")).toEqual(value);
});

const VITALIK_BLOG = {
	encoded:
		"0xe3010170122005b43a88130afedd1d8d99c271000298c8ec8dde7868be7f29fee5196ac91462",
	decoded: "ipfs://QmNiv9FodXu29MPFguLuZe4SBLd3DFar3m5UxaEwhuFqn1",
};

test(`contenthash`, async () => {
	const a = await register("vitalik");
	await a.foundry.confirm(
		a.registry.setContenthash(a.labelhash, VITALIK_BLOG.encoded)
	);
	expect(await a.resolver.getContentHash()).toEqual(VITALIK_BLOG.decoded);
});

test(`setRecords`, async () => {
	const a = await register("multi");
	await a.foundry.confirm(
		a.registry.setRecords(
			a.labelhash,
			[
				["a", "A"],
				["b", "B"],
			],
			[
				[0x80000000 + 139, toBeHex(1, 20)],
				[0x80000000 + 420, toBeHex(2, 20)],
			],
			[VITALIK_BLOG.encoded]
		)
	);
	expect(await a.resolver.getText("a")).toEqual("A");
	expect(await a.resolver.getText("b")).toEqual("B");
	expect(await a.resolver.getAddress(139)).toEqual(toBeHex(1, 20));
	expect(await a.resolver.getAddress(420)).toEqual(toBeHex(2, 20));
	expect(await a.resolver.getContentHash()).toEqual(VITALIK_BLOG.decoded);
});

test("setText() from wrong owner => error", async () => {
	const a = await register("chonk");
	expect(
		a.foundry.confirm(
			a.registry
				.connect(a.foundry.wallets.admin)
				.setText(a.labelhash, "avatar", "x")
		)
	).rejects.toThrow();
});

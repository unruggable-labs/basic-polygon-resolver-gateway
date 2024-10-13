import { serve } from "@resolverworks/ezccip/serve";
import { Foundry } from "@adraffy/blocksmith";
import { id } from "ethers";
import { deployDemo } from "./deploy-demo.js";

const foundry = await Foundry.launch({
	port: 31337
});

const { registry, registrar, fetchRecord } = await deployDemo(foundry);

await foundry.confirm(registrar.register("raffy"));
await foundry.confirm(
	registry.setText(
		id("raffy"),
		"avatar",
		"https://raffy.antistupid.com/ens.jpg"
	)
);

const port = parseInt(process.argv[2]) || 8000;

await serve(
	async (name) => {
		// TODO: enforce name suffixes here
		// eg. name.endsWith('.gon.id');

		// take leading label
		const pos = name.indexOf(".");
		const label = pos > 0 ? name.slice(0, pos) : name;
		return fetchRecord(label);
	},
	{
		protocol: "ens",
		port,
		// 0xd00d726b2aD6C81E894DC6B87BE6Ce9c5572D2cd
		signingKey:
			"0xbd1e630bd00f12f0810083ea3bd2be936ead3b2fa84d1bd6690c77da043e9e02",
	}
);

// https://resolverworks.github.io/ezccip.js/test/postman.html#endpoint=http%3A%2F%2Flocalhost%3A8000%2F&proto=ens&name=raffy&multi=inner&field=addr-&field=text-avatar

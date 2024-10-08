# Simple Polygon Resolver for ResolverWorks

A simple ENSIP-10 resolver and basic gateway (express) that returns appropriately encoded data directly from a configured RPC.

- Install dependencies with:
```bash
bun install
foundry install
```

- Add your Infura key in `server-adapters.ts`

- Run the gateway using:

```bash
bun start
```

- Run the test script with:

```bash
bun test test/PolygonResolver.test.ts
```
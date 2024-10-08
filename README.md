# Simple Polygon Resolver for ResolverWorks

An end to end solution for resolving names from a L2 chain using an ENSIP-10 compatible resolver deployed on L1 and a simple express gateway for facilitating cross chain communication.

Keyed based on subname label such that the multiple 2LDs can resolve to the same values.

### Testing/Demo

- Install dependencies with:
```bash
bun install
forge install
```

- **!!** Add your Infura key in `server-adapters.ts`

- Run the test script with:

```bash
bun test test/PolygonResolver.test.ts
```

### Running the gateway

- **!!** Set the appropriate parameters in `index.ts`, namely your Infura API key, and your L2 registry/resolver address (`NFTRegistry.sol`).
- Run the gateway using:

```bash
bun start
```
# Simple Polygon Resolver for ResolverWorks

An end to end solution for resolving names from a L2 chain using an ENSIP-10 compatible resolver deployed on L1 and a simple express gateway for facilitating cross chain communication.

Keyed based on subname label such that the L2 resolver can be 2LD agnostic.

### Setup

1. Copy `.env.example` to `.env` and configure appropriately.
1. `bun i`
1. `forge install`
1. `bun test`

### Example

1. `bun run examples/PolygonResolver.ts`

### Run the ezccip serve demo

1. `bun ezccip`
1. [Postman](https://resolverworks.github.io/ezccip.js/test/postman.html#endpoint=http%3A%2F%2Flocalhost%3A8000%2F&proto=ens&name=raffy&multi=inner&field=addr-&field=text-avatar)

### Run the express gateway

1. `bun express`


**Note** When deploying `PolygonResolver.sol` to L1, remember to call `setGatewayURLs` and `setSigner` to configure it appropriately.
The address you pass to `setSigner` should match the private key configured in `.env` for your gateway.
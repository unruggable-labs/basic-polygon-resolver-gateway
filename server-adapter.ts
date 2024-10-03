import { createServerAdapter } from "@whatwg-node/server";
import { Contract, JsonRpcProvider, AbiCoder } from "ethers";

const ABI_CODER = new AbiCoder();

//Using mainnet for now
const provider = new JsonRpcProvider(
  "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY
); // Replace with actual provider URL

const registryABI = [
  "function addr(bytes32 node) external view returns (address)",
  "function text(bytes32 node, string key) view returns (string text)",
  "function contenthash(bytes32 node) external view returns (bytes memory)",
];

// Using the mainnet public resolver for now
const registryAddress = process.env.REGISTRY_ADDRESS || ""; // Replace with actual registry address

const registryContract = new Contract(registryAddress, registryABI, provider);

// Create server adapter to handle requests
export default createServerAdapter(async (request: Request) => {
  if (request.method !== "POST") {
    return errorResponse("Only POST requests are allowed", 405);
  }

  try {
    const requestBody = await request.text();
    const requestData = JSON.parse(requestBody);
    const { sender, data: calldata } = requestData;

    if (!calldata) {
      return errorResponse("Missing calldata");
    }

    const functionSelector = calldata.slice(0, 10);
    const fn = registryContract.interface.getFunction(functionSelector);

    console.log(registryContract.interface);
    console.log("Function selector:", functionSelector);

    if (!fn) {
      return errorResponse(`Unsupported function selector ${functionSelector}`);
    }

    const result = await registryContract[fn!.name](
      ...registryContract.interface.decodeFunctionData(fn!.name, calldata)
    );

    const encodedResult = registryContract.interface.encodeFunctionResult(
      fn!.name,
      [result]
    );
    return successResponse(encodedResult);
  } catch (error) {
    return errorResponse("Failed to process request", 500);
  }
});

const successResponse = (data: string, status: number = 200) => {
  return new Response(JSON.stringify({ data }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const errorResponse = (message: string, status: number = 400) => {
  return new Response(JSON.stringify({ message }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

import { createServerAdapter } from "@whatwg-node/server";
import { Contract, JsonRpcProvider, AbiCoder } from "ethers";

const ABI_CODER = new AbiCoder();
const provider = new JsonRpcProvider(process.env.RPC_URL);
const registryABI = [
  "function addr(bytes32 node) external view returns (address)",
  "function text(bytes32 node, string key) view returns (string text)",
  "function contenthash(bytes32 node) external view returns (bytes memory)",
];
const registryAddress = process.env.REGISTRY_ADDRESS || "";
const registryContract = new Contract(registryAddress, registryABI, provider);

console.log(
  "Server adapter initialized with registry address:",
  registryAddress
);

export default createServerAdapter(async (request: Request) => {
  console.log("Received request:", request.method, request.url);

  if (request.method !== "POST") {
    console.log("Rejecting non-POST request");
    return errorResponse("Only POST requests are allowed", 405);
  }

  try {
    const requestBody = await request.text();
    console.log("Request body:", requestBody);

    const requestData = JSON.parse(requestBody);
    console.log("Parsed request data:", requestData);

    const { sender, data: calldata } = requestData;
    if (!calldata) {
      console.log("Missing calldata");
      return errorResponse("Missing calldata");
    }

    const functionSelector = calldata.slice(0, 10);
    console.log("Function selector:", functionSelector);

    const fn = registryContract.interface.getFunction(functionSelector);
    if (!fn) {
      console.log("Unsupported function selector:", functionSelector);
      return errorResponse(`Unsupported function selector ${functionSelector}`);
    }

    console.log("Calling function:", fn.name);
    const result = await registryContract[fn.name](
      ...registryContract.interface.decodeFunctionData(fn.name, calldata)
    );
    console.log("Function result:", result);

    const encodedResult = registryContract.interface.encodeFunctionResult(
      fn.name,
      [result]
    );
    console.log("Encoded result:", encodedResult);

    return successResponse(encodedResult);
  } catch (error) {
    console.error("Error processing request:", error);
    return errorResponse("Failed to process request", 500);
  }
});

const successResponse = (data: string, status: number = 200) => {
  console.log("Sending success response:", data);
  return new Response(JSON.stringify({ data }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const errorResponse = (message: string, status: number = 400) => {
  console.log("Sending error response:", message, status);
  return new Response(JSON.stringify({ message }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

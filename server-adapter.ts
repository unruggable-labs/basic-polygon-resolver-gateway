/// @author clowes.eth
/// Basic server adapter for resolving from Layer 2

import { createServerAdapter } from "@whatwg-node/server";
import { Contract, AbiCoder, Provider } from "ethers";

const ABI_CODER = new AbiCoder();
const registryABI = [
  "function addr(bytes32 node) public view returns (address)",
  "function addr(bytes32 node, uint256 coinType) external view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string text)",
  "function contenthash(bytes32 node) external view returns (bytes memory)",
];

export default (provider: Provider, registryAddress: string) => {
  return createServerAdapter(async (request: Request) => {
    console.log("1. Entering server adapter function");
    const registryContract = new Contract(
      registryAddress,
      registryABI,
      provider
    );

    if (request.method === "GET") {
      console.log("Rejecting non-GET request");
      return errorResponse("Only non-GET requests are allowed", 405);
    }

    try {
      const requestBody = await request.text();
      console.log("3. Received request body:", requestBody);

      console.log("4. Parsing JSON");

      const requestData = JSON.parse(requestBody);

      const { sender, data: wCalldata } = requestData;
      if (!wCalldata) {
        return errorResponse("Missing calldata");
      }
      console.log("6. Decoding ABI");
      const [labelhash, calldata] = ABI_CODER.decode(
        ["bytes32", "bytes"],
        wCalldata
      );
      console.log("--Full call data", calldata);

      const functionSelector = calldata.slice(0, 10);

      const fn = registryContract.interface.getFunction(functionSelector);
      const fullFunctionName = fn?.format("minimal");

      console.log("--Function Name:", fullFunctionName);

      if (!fn) {
        return errorResponse(
          `Unsupported function selector ${functionSelector}`
        );
      }

      const decodedFunctionData = registryContract.interface.decodeFunctionData(
        fn,
        calldata
      )!;
      console.log("Decoded function data:", decodedFunctionData);

      const modifiedFunctionData = [labelhash, ...decodedFunctionData.slice(1)];

      const result = await registryContract[functionSelector](
        ...modifiedFunctionData
      );

      console.log("Function Name:", fullFunctionName);
      console.log("Full call data", calldata);
      console.log("function data:", modifiedFunctionData);
      console.log("Result:", result);
      const encodedResult = registryContract.interface.encodeFunctionResult(
        fn,
        [result]
      );

      return successResponse(encodedResult);
    } catch (error) {
      console.log("ERROR: ", error);
      return errorResponse("Failed to process request", 500);
    }
  });
};

const successResponse = (data: string, status: number = 200) => {
  console.log("Sending success response:", data);
  return new Response(JSON.stringify({ data }), {
    status: status,
    headers: {
      "Content-Type": "text/plain",
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

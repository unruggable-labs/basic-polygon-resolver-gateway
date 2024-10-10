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
    const registryContract = new Contract(
      registryAddress,
      registryABI,
      provider
    );

    // if (request.method !== "POST") {
    //   console.log("Rejecting non-POST request");
    //   return errorResponse("Only POST requests are allowed", 405);
    // }

    try {
      const requestBody = await request.text();

      const requestData = JSON.parse(requestBody);

      const { sender, data: wCalldata } = requestData;
      if (!wCalldata) {
        return errorResponse("Missing calldata");
      }

      const [labelhash, calldata] = ABI_CODER.decode(
        ["bytes32", "bytes"],
        wCalldata
      );

      const functionSelector = calldata.slice(0, 10);

      const fn = registryContract.interface.getFunction(functionSelector);
      const fullFunctionName = fn?.format("minimal");

      if (!fn) {
        return errorResponse(
          `Unsupported function selector ${functionSelector}`
        );
      }

      const decodedFunctionData = registryContract.interface.decodeFunctionData(
        fn,
        calldata
      )!;
      const modifiedFunctionData = [labelhash, ...decodedFunctionData.slice(1)];

      const result = await registryContract[functionSelector](
        ...modifiedFunctionData
      );

      console.log("Function Name:", fullFunctionName);
      console.log("Decoded function data:", modifiedFunctionData);
      console.log("Result:", result);
      const encodedResult = registryContract.interface.encodeFunctionResult(
        fn,
        [result]
      );

      return successResponse(encodedResult);
    } catch (error) {
      return errorResponse("Failed to process request", 500);
    }
  });
};

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

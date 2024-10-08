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

    console.log("Provider", provider);
    //console.log("RECEIVED", request.registryAddress);

    console.log("Received request:", request.method, request.url);
    const registryContract = new Contract(registryAddress, registryABI, provider);

    if (request.method !== "POST") {
      console.log("Rejecting non-POST request");
      return errorResponse("Only POST requests are allowed", 405);
    }

    try {
      const requestBody = await request.text();
      console.log("Request body:", requestBody);

      const requestData = JSON.parse(requestBody);
      console.log("Parsed request data:", requestData);

      const { sender, data: wCalldata } = requestData;
      if (!wCalldata) {
        console.log("Missing calldata");
        return errorResponse("Missing calldata");
      }

      const [labelhash, calldata] = ABI_CODER.decode(["bytes32", "bytes"], wCalldata);

      console.log("labelhash", labelhash);
 
      const functionSelector = calldata.slice(0, 10);
      console.log("Function selector:", functionSelector);

      const fn = registryContract.interface.getFunction(functionSelector);
      const fullFunctionName = fn?.format("minimal");

      console.log("fullFunctionName", fullFunctionName);

      if (!fn) {
        console.log("Unsupported function selector:", functionSelector);
        return errorResponse(`Unsupported function selector ${functionSelector}`);
      }

      console.log("Calling function:", fullFunctionName!);
      //console.log("data", ...registryContract.interface.decodeFunctionData(fn, calldata));

      console.log("decoded", registryContract.interface.decodeFunctionData(fn, calldata)!);

      const decodedFunctionData = registryContract.interface.decodeFunctionData(fn, calldata)!;
      const modifiedFunctionData = [labelhash, ...decodedFunctionData.slice(1)];


      const result = await registryContract[functionSelector](
        ...modifiedFunctionData
      );
      console.log("Function result:", result);

      const encodedResult = registryContract.interface.encodeFunctionResult(
        fn,
        [result]
      );
      console.log("Encoded result:", encodedResult);

      return successResponse(encodedResult);
    } catch (error) {
      console.error("Error processing request:", error);
      return errorResponse("Failed to process request", 500);
    }
  });
}

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
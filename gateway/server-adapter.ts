/// @title Basic X-Chain Server Adapter for ENS
/// @author clowes.eth
/// @company Unruggable
import { createServerAdapter } from "@whatwg-node/server";
import { Contract, AbiCoder, type Provider, solidityPackedKeccak256, keccak256, SigningKey, Interface, toUtf8Bytes } from "ethers";

const ABI_CODER = new AbiCoder();
const L2_RESOLVER_ABI = [
  "function addr(bytes32 node) public view returns (address)",
  "function addr(bytes32 node, uint256 coinType) external view returns (bytes)",
  "function text(bytes32 node, string key) view returns (string text)",
  "function contenthash(bytes32 node) external view returns (bytes memory)",
];
const I_EXTENDED_RESOLVER_ABI = [
  "function resolve(bytes name, bytes data) external view returns (bytes)"
];
const I_EXTENDED_RESOLVER_INTERFACE = new Interface(I_EXTENDED_RESOLVER_ABI);

// Helper function to extract the first label from a DNS-encoded name
function getFirstLabelFromDNSEncoded(dnsBytes: string) {
  const data = typeof dnsBytes === 'string' ? hexStringToUint8Array(dnsBytes) : dnsBytes;
  const firstLabelLength = data[0];
  const firstLabelBytes = data.slice(1, 1 + firstLabelLength);
  const firstLabel = new TextDecoder("utf-8").decode(firstLabelBytes);
  return firstLabel;
}

// Helper function to convert a hex string to a Uint8Array
function hexStringToUint8Array(hexString: string) {
  const matches = hexString.match(/.{1,2}/g);
  const mapped = matches?.map(byte => parseInt(byte, 16));
  const byteArray = new Uint8Array(mapped ? mapped : []);
  return byteArray;
}

// Builder function for creating a configured server adapter
export default (provider: Provider, registryAddress: string) => {
  
  return createServerAdapter(async (request: Request) => {

    const registryContract = new Contract(
      registryAddress, 
      L2_RESOLVER_ABI, 
      provider
    );

    if (!["POST", "OPTIONS"].includes(request.method)) {
      console.log("Rejecting non-POST request");
      return errorResponse("Only POST requests are allowed", 405);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS", 
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {

      const requestBody = await request.text();
      const requestData = JSON.parse(requestBody);

      // msg.data is passed along
      const { sender, data: messageData } = requestData;
      if (!messageData) {
        return errorResponse("Missing msg.data");
      }

      // Decode the msg.data
      const [dnsEncodedName, calldata] = I_EXTENDED_RESOLVER_INTERFACE.decodeFunctionData("resolve", messageData);

      // Get the first label
      const firstLabel = getFirstLabelFromDNSEncoded(dnsEncodedName.substring(2));
      const labelhash = keccak256(toUtf8Bytes(firstLabel));

      const functionSelector = calldata.slice(0, 10);

      const fn = registryContract.interface.getFunction(functionSelector);
      const fullFunctionName = fn?.format("minimal");

      if (!fn) {
        return errorResponse(`Unsupported function selector ${functionSelector}`);
      }

      // Decoded the resolution function calldata
      const decodedFunctionData = registryContract.interface.decodeFunctionData(fn, calldata)!;

      console.log("fullFunctionName", fullFunctionName);
      console.log("Namehash", decodedFunctionData[0]);
      console.log("Labelhash", labelhash);
      
      // Replace the namehash with the labelhash as our resolver in 2LD agnostic
      const modifiedFunctionData = [labelhash, ...decodedFunctionData.slice(1)];

      // Call the resolution function on L2
      const result = await registryContract[functionSelector](
        ...modifiedFunctionData
      );

      // Encode the result
      const encodedResult = registryContract.interface.encodeFunctionResult(
        fn,
        [result]
      );

      // Configurable parameter for how long the response is valid
      const validityInSeconds = Number(process.env.CCIP_VALID_FOR_IN_SECONDS) ?? 60;
      const expires = Math.floor(Date.now() / 1e3) + validityInSeconds;

      // Pack our data in a format known to our CCIP callback
      let hash = solidityPackedKeccak256(
        ["bytes", "address", "uint64", "bytes32", "bytes32"],
        ["0x1900", sender, expires, keccak256(messageData), keccak256(encodedResult)]
      );

      // Sign the hash and bundle it in a structure known to our CCIP callback
      const signingKey = new SigningKey(process.env.SIGNER_PRIVATE_KEY!);
      const data = ABI_CODER.encode(
        ["bytes", "uint64", "bytes"],
        [encodedResult, expires, signingKey.sign(hash).serialized]
      );

      return successResponse(data);
      
    } catch (error) {
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
      "Access-Control-Allow-Origin": "*"
    },
  });
};

const errorResponse = (message: string, status: number = 400) => {
  console.log("Sending error response:", message, status);
  return new Response(JSON.stringify({ message }), {
    status: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  });
};
import { createServerAdapter } from '@whatwg-node/server';
import { Contract, JsonRpcProvider, AbiCoder } from 'ethers';

const ABI_CODER = new AbiCoder();

//Using mainnet for now
const provider = new JsonRpcProvider('https://mainnet.infura.io/v3/your-infura-key');

const resolverABI = [
    'function addr(bytes32 node) external view returns (address)',
    'function text(bytes32 node, string key) view returns (string text)',
    'function contenthash(bytes32 node) external view returns (bytes memory)'
];

// Using the mainnet public resolver for now
const resolverAddress = '0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41'; // Replace with actual resolver address

const resolverContract = new Contract(resolverAddress, resolverABI, provider);

// Create server adapter to handle requests
export default createServerAdapter(async (request: Request) => {
    if (request.method !== 'POST') {
        return errorResponse('Only POST requests are allowed', 405);
    }

    try {
        const requestBody = await request.text();
        const requestData = JSON.parse(requestBody);
        const { sender, data: calldata } = requestData;

        if (!calldata) {
            return errorResponse('Missing calldata');
        }

        const functionSelector = calldata.slice(0, 10);
        const fn = resolverContract.interface.getFunction(functionSelector);

        console.log(resolverContract.interface);
        console.log('Function selector:', functionSelector);

        if (!fn) {
            return errorResponse(`Unsupported function selector ${functionSelector}`);
        }

        const result = await resolverContract[fn!.name](...resolverContract.interface.decodeFunctionData(fn!.name, calldata));

        const encodedResult = resolverContract.interface.encodeFunctionResult(fn!.name, [result]);
        return successResponse(encodedResult);

    } catch (error) {
        return errorResponse('Failed to process request', 500);
    }
});

const successResponse = (data: string, status: number = 200) => {
    return new Response(JSON.stringify({ data }), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
        }
    });
}

const errorResponse = (message: string, status: number = 400) => {
    return new Response(JSON.stringify({ message }), {
        status: status,
        headers: {
            'Content-Type': 'application/json',
        }
    });
}
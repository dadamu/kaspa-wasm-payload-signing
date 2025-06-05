const kaspaWasm = require("./kaspa.js");
const fs = require("fs").promises;

function getRpc() {
  return (rpc = new kaspaWasm.RpcClient({
    url: "wss://ws.tn10.kaspa.forbole.com/borsh",
    networkId: "testnet-10",
  }));
}

async function main() {
  const wasmBuffer = await fs.readFile("./kaspa_bg.wasm");
  const wasmModule = new WebAssembly.Module(wasmBuffer);
  kaspaWasm.initSync(wasmModule);

  const rpc = getRpc();
  await rpc.connect();

  const privateKey = "b4253c63a84fb79b2e52dd89e6d19aab0f1ed643d4635ea077059e56a15f97bd";
  const address = "kaspatest:qzj2x9cutc4zyf3vfacyufau7alpk554arvztagjpq44dxptqhg7yu9388rv0";

  const { entries } = await rpc.getUtxosByAddresses([address]);
  if (entries.length === 0) {
    throw new Error("No UTXOs found");
  }

  const txGenerator = new kaspaWasm.Generator({
    entries: entries,
    outputs: [
      {
        address: address,
        amount: kaspaWasm.kaspaToSompi("1"),
      },
    ],
    priorityFee: kaspaWasm.kaspaToSompi("0.1"),
    changeAddress: address,
    networkId: "testnet-10",
    payload: "",
  });

  const txIds = [];
  while ((pending = await txGenerator.next())) {
    const test = await pending.sign([privateKey]);
    console.log("sign response:", test);
    const txid = await pending.submit(rpc);
    txIds.push(txid);
  }

  console.log("Transaction IDs:", txIds);
  await rpc.disconnect();
}

main();
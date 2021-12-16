import Connector from '@vite/connector';

// Only use this for anything related to accountBlocks; otherwise use the websockets provider

async function sendTransactionAsync(vbInstanceG: Connector, ...args: any): Promise<any> {
  console.log("Sending transaction");
  if (vbInstanceG === undefined) {
    console.log("Instance is not ready yet");
    return;
  }
  return new Promise((res, rej) => {
    vbInstanceG.on('disconnect', () => {
      rej("Request aborted due to disconnect.");
    });

    vbInstanceG.sendCustomRequest({ method: 'vite_signAndSendTx', params: args }).then((r: any) => {
      vbInstanceG.updateSession();
      res(r);
    }).catch((e: any) => {
      rej(e);
    });
  });
}

export default sendTransactionAsync

import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from 'react';
import Connector from '@vite/connector';
import QRCode from "react-qr-code";
import Modal from 'react-modal';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
const { Contracts, Vite_TokenId } = constant;
//Modal.setAppElement('#root');

const Home: NextPage = () => {
  const [vbInstanceG, setVBInstanceG] = useState(undefined);
  const [connectURI, connectURISet] = useState("");
  const [connected, setConnected] = useState(false);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }
  const testnethelloworldContract = "vite_a7e1e2330b8962e852289e951f649818ec62172576b4828933"
  const helloWorldABI = [{ "constant": false, "inputs": [{ "name": "addr", "type": "address" }], "name": "SayHello", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "anonymous": false, "inputs": [{ "indexed": true, "name": "addr", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" }], "name": "transfer", "type": "event" }]


  async function sendTransactionAsync(...args: any): Promise<any> {
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

  async function sendTx() {
    console.log("SendTx");
    if (vbInstanceG === undefined) {
      console.log("Instance is not ready yet");
      return;
    }
    let block = accountBlock.createAccountBlock("callContract", {
      address: accounts[0],
      toAddress: testnethelloworldContract,
      methodName: "SayHello",
      abi: helloWorldABI,
      params: [accounts[0]],
      tokenId: Vite_TokenId,
      amount: '1000000000000000000'
    });

    const response = await sendTransactionAsync({ block: block.accountBlock });
    console.log(response);
  }




  useEffect(() => {
    const vbInstance = new Connector({ bridge: process.env.NEXT_PUBLIC_CONNECTOR });
    vbInstance.createSession().then(() => connectURISet(vbInstance.uri));
    vbInstance.on('connect', (e: Error | null, payload: any | null) => {
      if (e) {
        return window.alert('connect error: ' + JSON.stringify(e));
      }
      const { accounts } = payload.params[0];
      console.log(payload)
      if (!accounts || !accounts[0]) throw new Error('address is null');
      connectURISet('');
      setAccounts(accounts)
      // Can insert onConnect logic here
      setVBInstanceG(vbInstance);
    });
    vbInstance.on('disconnect', () => {
      setVBInstanceG(undefined);
    });
    setVBInstanceG(vbInstance)
  }, [])

  if (vbInstanceG === undefined) {
    return <div>Loading...</div>
  }
  else {
    return (
      <div>
        <button onClick={openModal}>Open Modal</button>
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}>
          <button onClick={closeModal}>close</button>
          <QRCode value={connectURI} />
        </Modal>
        <button onClick={sendTx}>Send TX</button>
      </div>
    )


  }
}

export default Home

import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { useState, useEffect } from 'react';
import Connector from '@vite/connector';
import QRCode from "react-qr-code";
import Modal from 'react-modal';
import { constant, abi, accountBlock, utils, ViteAPI } from '@vite/vitejs';
import Swap from '../components/swap'
import Pool from '../components/pool'
const { Contracts, Vite_TokenId } = constant;
import { WS_RPC } from '@vite/vitejs-ws';
import { callOnChain } from '../utils/transactions'
//Modal.setAppElement('#root');

const Home: NextPage = () => {
  const [vbInstanceG, setVBInstanceG] = useState<Connector>(undefined);
  const [connectURI, connectURISet] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [contractAddress, setContractAddress] = useState("");
  const [contractSet, setContractSet] = useState(false);
  const [pageNav, setPageNav] = useState("pool");
  const [wsProvider, setWSProvider] = useState<typeof ViteAPI | undefined>(undefined);

  useEffect(() => {
    const wsrpc = new WS_RPC('ws://localhost:41420');
    const provider = new ViteAPI(wsrpc, () => {
      console.log("connected to provider");
      setWSProvider((provider as unknown) as (typeof ViteAPI));
    });
    const vbInstance = new Connector({ bridge: process.env.NEXT_PUBLIC_CONNECTOR });
    // Chain ID 3 for debug/local
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
      console.log(vbInstance);
      //      callOnChain(accounts, provider, vbInstance, "deposit", [],  "tti_06822f8d096ecdf9356b666c", '10000000000000000').then((res) => console.log(res));
    });
    vbInstance.on('disconnect', () => {
      setVBInstanceG(undefined);
    });
    setVBInstanceG(vbInstance)
  }, [])

  interface EventTarget {
    value: string
  }

  interface InputEvent {
    target: EventTarget
  }


  function handleContractInputChange(event: InputEvent) {
    setContractAddress(event.target.value)
  }

  if (vbInstanceG === undefined || wsProvider === undefined) {
    return <div>Loading...</div>
  }
  else if (accounts.length == 0) {
    return (
      <div>
        <div>Scan code with the VITE app</div>
        <QRCode value={connectURI} />
      </div>
    )
  }
  else if (pageNav == "pool") {
    return (
      <Pool vbInstance={vbInstanceG} accounts={accounts} provider={wsProvider} contractAddress={contractAddress} />
    )
  }
  else {
    return (
      <Swap vbInstance={vbInstanceG} accounts={accounts} />
    )
  }
}

export default Home

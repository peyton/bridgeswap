import Connector from '@vite/connector';

interface MainProps {
  vbInstance: Connector;
  accounts: string[];
}

const Main = ({ vbInstance, accounts }: MainProps) => {
  return (
    <div>
      <h1>Swap Tokens</h1>
    </div>
  )
}

export default Main

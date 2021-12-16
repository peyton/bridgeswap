import Connector from '@vite/connector';

interface SwapProps {
  vbInstance: Connector;
  accounts: string[];
}

const Swap = ({ vbInstance, accounts }: SwapProps) => {
  return (
    <div>
      <h1>Swap Tokens</h1>
    </div>
  )
}

export default Swap

// adapted from bridge-vite

import stream from 'stream'
import getStream from 'get-stream'
import Docker from 'dockerode'

const docker = new Docker()

async function _dockerRun(
  image: string,
  params: string[],
  config: any
) {
  const pullResult = await docker.pull(image)
  const outputStream = new stream.PassThrough()
  const result = await docker.run(image, params, outputStream, config)
  outputStream.end()
  const output = await getStream(outputStream)
  return output
}

export const dockerRun = _dockerRun

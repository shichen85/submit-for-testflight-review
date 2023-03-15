import * as core from '@actions/core'
import {updateTestFlight} from './app-store-connect-api'

async function run(): Promise<void> {
  try {
    const appId = core.getInput('app-id')
    const version = core.getInput('bundle-version-string')
    const groupName = core.getInput('group-name')
    const issuerId = core.getInput('issuer-id')
    const apiKeyId = core.getInput('api-key-id')
    const apiPrivateKey = core.getInput('api-private-key')
    const whatsnew = core.getInput('whats-new')

    await updateTestFlight(
      appId,
      version,
      groupName,
      issuerId,
      apiKeyId,
      apiPrivateKey,
      whatsnew
    )
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()

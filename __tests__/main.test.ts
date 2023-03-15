import {readFileSync} from 'fs'
import {updateTestFlight} from '../src/app-store-connect-api'
import {test} from '@jest/globals'

test('Test updating AppStore Connect', async () => {
  const appId = '123456789'
  const version = '100.100.2017'
  const group = 'external'

  const secret = readFileSync('secret.json', 'utf8')
  const macConfig = JSON.parse(secret)

  await updateTestFlight(
    appId,
    version,
    group,
    macConfig.iss,
    macConfig.kid,
    macConfig.key,
    'desc'
  )
}, 10000000)

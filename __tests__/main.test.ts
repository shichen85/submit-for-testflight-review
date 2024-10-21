import {readFileSync} from 'fs'
import {updateTestFlight} from '../src/app-store-connect-api'
import {test} from '@jest/globals'
import dotenv from 'dotenv'
dotenv.config()

test('Test updating AppStore Connect', async () => {
  const appId = process.env.APPID || '123456789'
  const version = process.env.VERSION ||'100.100.2017'
  const group = process.env.GROUP ||'external'
  const secret = process.env.SECRET as string
  const macConfig = JSON.parse(secret)

  await updateTestFlight(
    appId,
    version,
    group,
    macConfig.issuer_id,
    macConfig.key_id,
    macConfig.key,
    'desc'
  )
}, 10000000)

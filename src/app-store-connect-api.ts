import axios, {AxiosRequestConfig} from 'axios'
import {sign} from 'jsonwebtoken'

interface BetaBuildLocalizations {
  locale: string
  whatsNew: string | null
}

interface BuildBetaDetails {
  autoNotifyEnabled: boolean
  didNotify: boolean
  externalBuildState: string
  internalBuildState: string
}

class AppStoreRequestClient {
  constructor(
    private issuerId: string,
    private keyId: string,
    private privateKey: string,
    private appID: string,
    private version: string
  ) {}

  private lastTokenTime = new Date().getTime()
  private lastToken = ''
  private tokenDuration = 60 * 10 //in seconds
  private buildId = ''
  private localizationId = ''
  private groupId = ''

  private generateToken = () => {
    const currentTime = new Date().getTime()
    const expTime = Math.floor(currentTime / 1000) + this.tokenDuration * 1.5
    const jwtPayload = {
      iss: this.issuerId,
      exp: expTime,
      aud: 'appstoreconnect-v1'
    }
    const jwtHeader = {
      kid: this.keyId,
      typ: 'JWT',
      alg: 'ES256'
    }
    const token = sign(jwtPayload, this.privateKey, {
      algorithm: 'ES256',
      header: jwtHeader
    })
    return token
  }

  private async request(
    method: 'get' | 'post' | 'patch' | 'put' | 'delete' | 'head' | 'options',
    url: string,
    options?: AxiosRequestConfig,
    baseURL = 'https://api.appstoreconnect.apple.com/v1/'
  ) {
    //Generate token if it's not exist or expired
    const currentTime = new Date().getTime()
    const tokenExpired =
      (currentTime - this.lastTokenTime) / 1000 > this.tokenDuration
    if (!this.lastToken || tokenExpired) {
      this.lastTokenTime = currentTime
      this.lastToken = this.generateToken()
    }

    //Add token to header
    const headers = {
      ...options?.headers,
      Authorization: this.lastToken
    }

    //Wrap the data in a data object
    const data = {
      data: options?.data
    }

    const requestOptions: AxiosRequestConfig = {
      ...options,
      baseURL,
      method,
      headers,
      data
    }

    const res = await axios(url, requestOptions)
    return res.data
  }

  async fetchLastBuildId() {
    const params = {
      'filter[app]': this.appID,
      'filter[version]': this.version,
      'filter[expired]': false,
      'filter[processingState]': 'VALID'
    }
    const url = 'builds'
    const res = await this.request('get', url, {params})
    this.buildId = res.data[0].id
  }

  /**
   * Get the beta build localization ID so we can update the "WhatsNew" section in TestFlight
   */
  async getBetaBuildLocalizationsId() {
    const response = await this.request(
      'get',
      `builds/${this.buildId}/betaBuildLocalizations`
    )
    const res = (
      response as {data: {attributes: BetaBuildLocalizations; id: string}[]}
    ).data
    this.localizationId = res[0].id
  }

  /**
   * update beta build localization to let users known what's new
   */
  async updateBetaBuildLocalization(whatsNew: string) {
    const data = {
      type: 'betaBuildLocalizations',
      id: this.localizationId,
      attributes: {
        whatsNew
      }
    }
    await this.request(
      'patch',
      `betaBuildLocalizations/${this.localizationId}`,
      {
        data
      }
    )
  }

  /**
   * Get the build beta details to check that the build status is ready for submission
   */
  private async getBuildBetaDetails() {
    const response = await this.request(
      'get',
      `buildBetaDetails/${this.buildId}`
    )
    return (response as {data: {attributes: BuildBetaDetails; id: string}}).data
  }

  async checkBuildIsReady() {
    const betaBuildDetailData = await this.getBuildBetaDetails()
    const externalBuildState =
      betaBuildDetailData?.attributes.externalBuildState
    const internalBuildState =
      betaBuildDetailData?.attributes.internalBuildState
    const acceptableBuildState = ['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING']
    const rejectableBuildState = [
      'PROCESSING_EXCEPTION',
      'MISSING_EXPORT_COMPLIANCE'
    ]
    if (!externalBuildState || !internalBuildState) {
      throw 'Error querying build state.'
    } else if (
      externalBuildState == 'READY_FOR_BETA_SUBMISSION' &&
      acceptableBuildState.includes(internalBuildState)
    ) {
    } else if (
      rejectableBuildState.includes(externalBuildState) ||
      rejectableBuildState.includes(internalBuildState)
    ) {
      throw externalBuildState
    } else {
      console.log('Current external state: ' + externalBuildState)
      console.log('Current internal state: ' + internalBuildState)
      throw 'AppStoreConnect is still processing the build.'
    }
  }

  async enableAutoNotify() {
    const data = {
      type: 'buildBetaDetails',
      id: this.buildId,
      attributes: {
        autoNotifyEnabled: true
      }
    }
    await this.request('patch', `buildBetaDetails/${this.buildId}`, {
      data
    })
  }

  private async getGroupIdByName(groupName: string) {
    const qs = {
      'fields[apps]': 'betaGroups',
      'filter[app]': this.appID,
      'filter[name]': groupName,
      'filter[isInternalGroup]': false
    }
    const url = 'betaGroups'
    const res = await this.request('get', url, {params: qs})
    const group = res.data[0]
    this.groupId = group.id
  }

  async addBuildToBetaGroup(groupName: string) {
    await this.getGroupIdByName(groupName)
    const data = [{type: 'builds', id: this.buildId}]
    return await this.request(
      'post',
      `betaGroups/${this.groupId}/relationships/builds`,
      {
        data
      }
    )
  }

  async submitForBetaReview() {
    const data = {
      type: 'betaAppReviewSubmissions',
      relationships: {build: {data: {type: 'builds', id: this.buildId}}}
    }
    return await this.request('post', `betaAppReviewSubmissions`, {data})
  }
}

export const updateTestFlight = async (
  appID: string,
  version: string,
  groupName: string,
  issuerId: string,
  keyId: string,
  privateKey: string,
  whatsNew = ''
) => {
  const client = new AppStoreRequestClient(
    issuerId,
    keyId,
    privateKey,
    appID,
    version
  )

  console.log(
    `Updating test flight: ${appID}, ${version}, ${groupName}, ${whatsNew}`
  )
  await client.fetchLastBuildId()
  await client.checkBuildIsReady()
  await client.getBetaBuildLocalizationsId()
  await client.updateBetaBuildLocalization(whatsNew)
  await client.enableAutoNotify()
  await client.addBuildToBetaGroup(groupName)
  await client.submitForBetaReview()
  console.log('Submitted for beta review')
}

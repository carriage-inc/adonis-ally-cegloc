/*
 * Cegloc (Keycloak) driver for AdonisJS/Ally
 */

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import {
  AllyUserContract,
  ApiRequestContract,
  RedirectRequestContract,
} from '@ioc:Adonis/Addons/Ally'
import { Oauth2Driver } from '@adonisjs/ally/build/standalone'

/**
 * Shape of the Cegloc access token
 */
export type CeglocToken = {
  token: string
  type: 'bearer'
}

/**
 * Available scopes for Cegloc
 */
export type CeglocScopes = 'openid' | 'profile' | 'email'

/**
 * Configuration for the Cegloc driver
 */
export type CeglocDriverConfig = {
  driver: 'cegloc'
  clientId: string
  clientSecret: string
  callbackUrl: string
  baseUrl: string
  realm: string
  scopes?: CeglocScopes[]
  authorizeUrl?: string
  accessTokenUrl?: string
  userInfoUrl?: string
}

/**
 * Contract for Cegloc driver
 */
export interface CeglocDriverContract {
  accessDenied(): boolean
  user(callback?: (request: ApiRequestContract) => void): Promise<AllyUserContract<CeglocToken>>
  userFromToken(
    token: string,
    callback?: (request: ApiRequestContract) => void
  ): Promise<AllyUserContract<CeglocToken>>
}

/**
 * Cegloc driver to login user via Cegloc (Keycloak)
 */
export class CeglocDriver
  extends Oauth2Driver<CeglocToken, CeglocScopes>
  implements CeglocDriverContract
{
  /**
   * Default URLs
   */
  protected accessTokenUrl = ''
  protected authorizeUrl = ''
  protected userInfoUrl = ''

  /**
   * The param name for the authorization code
   */
  protected codeParamName = 'code'

  /**
   * The param name for the error
   */
  protected errorParamName = 'error'

  /**
   * Cookie name for storing the "cegloc_oauth_state"
   */
  protected stateCookieName = 'cegloc_oauth_state'

  /**
   * Parameter name to be used for sending and receiving the state
   */
  protected stateParamName = 'state'

  /**
   * Parameter name for defining the scopes
   */
  protected scopeParamName = 'scope'

  /**
   * Scopes separator
   */
  protected scopesSeparator = ' '

  constructor(ctx: HttpContextContract, public config: CeglocDriverConfig) {
    super(ctx, config)

    // Set the URLs based on the config
    this.accessTokenUrl =
      this.config.accessTokenUrl ||
      `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/token`

    this.authorizeUrl =
      this.config.authorizeUrl ||
      `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/auth`

    this.userInfoUrl =
      this.config.userInfoUrl ||
      `${this.config.baseUrl}/realms/${this.config.realm}/protocol/openid-connect/userinfo`

    /**
     * Extremely important to call the following method to clear the
     * state set by the redirect request
     */
    this.loadState()
  }

  /**
   * Configuring the redirect request with defaults
   */
  protected configureRedirectRequest(request: RedirectRequestContract<CeglocScopes>) {
    /**
     * Define user defined scopes or the default one's
     */
    request.scopes(this.config.scopes || ['openid', 'profile', 'email'])
    request.param('response_type', 'code')
    request.param('client_id', this.config.clientId)
  }

  /**
   * Configuring the access token API request to send extra fields
   */
  protected configureAccessTokenRequest(request: ApiRequestContract) {
    /**
     * Send client_id and client_secret as request body parameters
     */
    request.field('client_id', this.config.clientId)
    request.field('client_secret', this.config.clientSecret)
    request.field('redirect_uri', this.config.callbackUrl)

    /**
     * Send state to cegloc when request is not stateless
     */
    if (!this.isStateless) {
      request.field('state', this.stateCookieValue)
    }
  }

  /**
   * Returns the HTTP request with the authorization header set
   */
  protected getAuthenticatedRequest(url: string, token: string) {
    const request = this.httpClient(url)
    request.header('Authorization', `Bearer ${token}`)
    request.header('Accept', 'application/json')
    request.parseAs('json')
    return request
  }

  /**
   * Fetches the user info from the Cegloc API
   */
  protected async getUserInfo(token: string, callback?: (request: ApiRequestContract) => void) {
    const request = this.getAuthenticatedRequest(this.userInfoUrl, token)
    if (typeof callback === 'function') {
      callback(request)
    }

    const body = await request.get()
    return {
      id: body.sub,
      nickName: body.preferred_username,
      name: body.name,
      email: body.email,
      emailVerificationState: (body.email_verified ? 'verified' : 'unverified') as
        | 'verified'
        | 'unverified',
      avatarUrl: null,
      original: body,
      // Optional fields from the document that could be useful
      firstName: body.given_name,
      lastName: body.family_name,
      locale: body.locale,
    }
  }

  /**
   * Find if the current error code is for access denied
   */
  public accessDenied(): boolean {
    const error = this.getError()
    if (!error) {
      return false
    }

    return error === 'access_denied' || error === 'invalid_grant'
  }

  /**
   * Returns details for the authorized user
   */
  public async user(callback?: (request: ApiRequestContract) => void) {
    const token = await this.accessToken(callback)
    const user = await this.getUserInfo(token.token, callback)

    return {
      ...user,
      token: token,
    }
  }

  /**
   * Finds the user by the access token
   */
  public async userFromToken(token: string, callback?: (request: ApiRequestContract) => void) {
    const user = await this.getUserInfo(token, callback)

    return {
      ...user,
      token: { token, type: 'bearer' as const },
    }
  }
}

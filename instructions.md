# AdonisJS Ally Cegloc Driver

This package provides a custom Ally driver for the CEGLOC Keycloak authentication system.

## Configuration

First, define the mapping inside the `contracts/ally.ts` file as follows:

```ts
import { CeglocDriver, CeglocDriverConfig } from 'adonis-ally-cegloc/build/standalone'

declare module '@ioc:Adonis/Addons/Ally' {
  interface SocialProviders {
    // ... other mappings
    cegloc: {
      config: CeglocDriverConfig
      implementation: CeglocDriver
    }
  }
}
```

## Environment Variables

Add the following environment variables to your `.env` file:

```
CEGLOC_CLIENT_ID=your-client-id
CEGLOC_CLIENT_SECRET=your-client-secret
CEGLOC_BASE_URL=https://japanese.cegloc.tsukuba.ac.jp
CEGLOC_REALM=cegloc
CEGLOC_CALLBACK_URL=http://your-site.com/auth/cegloc/callback
```

## Configuration File

Update your `config/ally.ts` file to include the Cegloc driver:

```ts
import Env from '@ioc:Adonis/Core/Env'
import { AllyConfig } from '@ioc:Adonis/Addons/Ally'

const allyConfig: AllyConfig = {
  // other drivers...
  
  cegloc: {
    driver: 'cegloc',
    clientId: Env.get('CEGLOC_CLIENT_ID'),
    clientSecret: Env.get('CEGLOC_CLIENT_SECRET'),
    baseUrl: Env.get('CEGLOC_BASE_URL'),
    realm: Env.get('CEGLOC_REALM'),
    callbackUrl: Env.get('CEGLOC_CALLBACK_URL')
  }
}

export default allyConfig
```

## Usage Example

```ts
import Route from '@ioc:Adonis/Core/Route'
import AllyController from 'App/Controllers/Http/AllyController'

Route.get('/auth/cegloc/redirect', 'AllyController.redirectToCegloc')
Route.get('/auth/cegloc/callback', 'AllyController.ceglocCallback')
```

In your controller:

```ts
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class AllyController {
  public async redirectToCegloc({ ally }: HttpContextContract) {
    return ally.use('cegloc').redirect()
  }

  public async ceglocCallback({ ally, auth, response }: HttpContextContract) {
    const cegloc = ally.use('cegloc')
    
    /**
     * User has denied access to their account
     */
    if (cegloc.accessDenied()) {
      return 'Access was denied'
    }
    
    /**
     * Handle the case when redirect URL has an error
     */
    if (cegloc.hasError()) {
      return cegloc.getError()
    }
    
    const user = await cegloc.user()
    
    // Now you can:
    // 1. Find or create a user in your database
    // 2. Sign them in using auth.login() or using sessions
    // 3. Return or redirect

    return user
  }
}
```
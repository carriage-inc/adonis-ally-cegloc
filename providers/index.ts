import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class CeglocDriverProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const Ally = this.app.container.resolveBinding('Adonis/Addons/Ally')
    const { CeglocDriver } = await import('../src/CeglocDriver')

    Ally.extend('cegloc', (_, __, config, ctx) => {
      return new CeglocDriver(ctx, config)
    })
  }
}

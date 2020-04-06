import { Configs } from '../../../db/models';
import { moduleCheckPermission } from '../../permissions/wrappers';
import { IContext } from '../../types';
import { makeRandomId, registerOnboardHistory, resetConfigsCache } from '../../utils';

const configMutations = {
  /**
   * Create or update config object
   */
  async configsUpdate(_root, { configsMap }, { user }: IContext) {
    const codes = Object.keys(configsMap);

    for (const code of codes) {
      if (!code) {
        continue;
      }

      const prevConfig = (await Configs.findOne({ code })) || { value: [] };

      const value = configsMap[code];
      const doc = { code, value };

      await Configs.createOrUpdateConfig(doc);

      resetConfigsCache();

      const updatedConfig = await Configs.getConfig(code);

      if (
        ['dealUOM', 'dealCurrency'].includes(code) &&
        prevConfig.value.toString() !== updatedConfig.value.toString()
      ) {
        registerOnboardHistory({ type: `configure.${code}`, user });
      }
    }
  },

  async generateTokenConfig(_root, {key}: { key: string }) {
    const apiKeyConfig = await Configs.findOne({ code: 'API_KEY' });

    if ( !apiKeyConfig ) {
      await Configs.create({
        code: 'API_KEY',
        value: makeRandomId({length: 25})
      })
    }

    const tokenConfigs = await Configs.findOne({ code: 'API_TOKENS' });

    const tokens = tokenConfigs?.value || {}

    if (!Object.keys(tokens).includes(key)) {
      tokens[key] = makeRandomId({length: 40});
    }

    await Configs.createOrUpdateConfig({
      code: 'API_TOKENS',
      value: tokens
    });
  }
};

moduleCheckPermission(configMutations, 'manageGeneralSettings');

export default configMutations;

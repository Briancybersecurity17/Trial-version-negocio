import { localEntities, exportAllData } from './localDb.js';

export const base44 = {
  entities: localEntities,
  auth: {
    me: async () => ({ id: 'local-user', email: 'local@minegocio.app', full_name: 'Usuario Local' }),
    logout: () => {},
    redirectToLogin: () => {},
  },
  exportAllData,
};

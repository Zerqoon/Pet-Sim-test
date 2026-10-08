import { handleValueApi } from '../../../lib/value-api.js';
export const onRequest = context => handleValueApi(context, 'values');

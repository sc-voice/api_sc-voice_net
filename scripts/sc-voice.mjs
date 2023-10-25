import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);

import { logger, } from 'log-instance';
import ScvServer from '../src/scv-server.mjs';
import ApiConfig from '../api.config.mjs';

// ensure argv is actually for script instead of mocha
var argv = process.argv[1].match(__filename) && process.argv || [];
argv.filter(a => a==='--log-debug').length && (logger.level = 'debug');
var port = argv.reduce((a,v)=>{
  if (v === '-3000') { 
    return 3000;    // legacy option
  }
  if (v.startsWith('--port:')) {
    return Number(v.replace('--port:', ''));
  }
  return a;
}, undefined);
var apiUrl = argv.some((a) => a === '--staging')
    ? 'http://staging.suttacentral.net/api'
    : 'http://suttacentral.net/api';

let protocol = argv.some((a) => a === '--ssl') ? "https" : "http";
let autoSyncSeconds = 3600; // autoSyncEbtData
let opts = { 
  apiUrl, 
  protocol, 
  autoSyncSeconds, 
  monitors: ApiConfig.monitors,
};
port != null && (opts.port = port);
let scv = new ScvServer(opts);
await scv.initialize();

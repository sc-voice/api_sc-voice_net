const ApiConfig = {
  monitors: [{
    interval: 10000,
    probes: [{
      url: 'https://www.api.sc-voice.net/scv/statfs', 
      type: "statfs",
      jsonFilter: {
        api_scvoice_version: true,
        blocks: true,
        bavail_percent: true,
        ffree_percent: true
      },
    },{
      url: 'https://staging.api.sc-voice.net/scv/statfs', 
      type: "statfs",
      jsonFilter: {
        api_scvoice_version: true,
        blocks: true,
        bavail_percent: true,
        ffree_percent: true
      },
    }],
  }],
}

export default ApiConfig;

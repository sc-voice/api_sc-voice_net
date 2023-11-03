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
    },{
      url: 'https://s1.sc-voice.net/scv/play/segment/thig1.1/en/soma/thig1.1%3A1.1/Amy',
      type: "play/segment",
      jsonFilter: {
        segment: true,
      },
    },{
      url: 'https://voice.suttacentral.net/scv/play/segment/thig1.1/en/soma/thig1.1%3A1.1/Amy',
      type: "play/segment",
      jsonFilter: {
        segment: true,
      },
    }],
  }],
}

export default ApiConfig;

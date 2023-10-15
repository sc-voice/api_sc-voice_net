# api.sc-voice.net

NodeJS server for [voice.suttacentral.net](https://voice.suttacentral.net)

# Installation

### Prerequisites

* Linux Debian 10 or Ubuntu 20.04
* Nodejs 16.x
* Server credentials for AWS Polly account 

### Local installation

Initialization requires super user access for your computer and you may
be asked to enter your computer superuser password.

```
git clone https://github.com/sc-voice/api_sc-voice_net
cd api_sc-voice_net
install
```

To run api_sc-voice_net locally on port 3000:

```
scripts/sc-voice --port:3000
```

### Linode installation


```
./scripts/init.sh
```

Now update the content but do not reboot (i.e., Respond with <kbd>no</kbd> when asked to reboot)
```
./scripts/update-latest
```

As part of installation you will need to configure the AWS Polly TTS service adapter.

##### Configure Amazon AWS Polly 
The [Amazon AWS Polly Text-to-Speech](https://aws.amazon.com/polly/) service 
is used to convert multilingual sutta text to speech. 
Furthermore, sutta text contains many Pali references that require 
SSML customization specific to AWS.
To enable AWS Polly, you will need to [configure your credentials](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html#getting-started-nodejs-credentials)

Login to your AWS account and go to the IAM dashboard|Delete your root access keys|Manage Security Credentials|Access Keys...|Create New Access Key

<img src="https://raw.githubusercontent.com/sc-voice/sc-voice/master/src/assets/aws-keys.png"/>


```
{
  "Bucket": "sc-voice-vsm",
  "s3": {
    "apiVersion": "2006-03-01",
    "endpoint": "https://s3.us-west-1.amazonaws.com",
    "region": "us-west-1"
  },
  "polly": {
    "region": "us-west-1",
    "signatureVersion": "v4",
    "apiVersion": "2016-06-10"
  },
  "sayAgain": {
    "Bucket": "say-again.sc-voice"
  },
  "region": "us-west-1",
  "secretAccessKey": "########################################",
  "accessKeyId": "####################"
}
```

```
aws configure
```

##### Launch localhost server
```
npm start
```

Open up <kbd>localhost</kbd> in your local browser and you will see Voice.
When you are done with voice, type <kbd>CTRL-C</kbd> in the terminal.

### Unit tests
```
npm run test
```
Unit tests take about 2 minutes.
The unit tests require AWS Polly. 

To execute a single unit/test, simply insert the text `TESTTEST`
into the `it("...")` title argument. Then run `npm run test:test`, 
which selectively tests such unit tests whenever a source file changes. 
This makes quick work of debugging or implementing a feature.

##### Test failures
* Some tests validate online APIs and may fail due to timeouts 
or `EAI_AGAIN` responses. Re-run tests and they should pass.
* Some tests validate online content which may change. For example, the number of search results may change slightly. Update the unit tests accordingly and re-run tests.

### Scripts

 | Command line script | Description |
 | :----- | :---------- |
 | `npm run test`  | Run service unit tests (about 2 minutes). |
 | `npm run serve` | Compile and reload SC-Voice Vue for development at http://localhost:8080 |
 | `npm run build` | Create production Vue build in `dist` folder |
 | `npm run lint`  | Run esLint to check *.js and *.vue files `|


### Other
#### Directory structure

* **src** contains Javascript source code
* **test** contains Javascript unit tests
* **scripts** contains miscellaneous scripts
* **local** contains local content not archived in git
* **public** Vue/Vuetify public HTML assets
* **words** contains language lexicons for search and speech.


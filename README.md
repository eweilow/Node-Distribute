# Node.js File Distribution
node-file-distribution is a project for distributing files over the network between several node.js servers.

## Features
* Support for authentication through api-keys.
* Basic prevention of DDoS through connecting by minimum amount of time between connections per ip.


## Creating a node server
```javascript
var config = require("file-distribution").config;
var cfg = config.readOrMake("./config/defaultnode.json", function () { 
  return { port: 8081, host: "localhost", segmentation: 10, basepath: "./files/node", apikey: "" };
});
cfg = config.override(argv, cfg);
  
var node = require("file-distribution").node;
node.configuration(cfg);
node.connect();  
node.initialize();
```

To do periodic updates, you can do the following:
```javascript
var seconds = 60.0; //Every 60 seconds it connects and then disconnects
var timeout = 15.0; //Give the node time to do its' thing
setInterval(function () {
  node.connect();
  setTimeout(function () {
    node.disconnect();
  }, timeout * 1000); 
}, seconds * 1000);
```

You can go even fancier and use a configuration file for it ;)
```javascript
var cfg = require("file-distribution").config.readOrMake("./config/nodetimings.json", function () { 
  return { seconds-between: 60.0, connect-timeout: 15.0 };
});

var seconds = cfg.seconds-between;
var timeout = cfg.connect-timeout;
```

#### Configuration
A node instance takes the following configuration parameters in its' `configuration(cfg)` method:

* `port` - Defines which port the node connects to.
* `host` - Defines the host the node connects to.
* `segmentation` - Sets the count of timestamp data that is sent for each message.
* `basepath` - Sets the path relative to root where files are stored.
* `apikey` - Set the apikey which the node authenticates with.
* `allowedfiletypes` - An array of file-types (Looking like ´.txt´ with the preceding dot included) an instance is allowed to manage.
* `debugmessages` - Sets if debug messages are shown.

## Creating a master server
```javascript
var cfg = require("file-distribution").config.readOrMake("./config/defaultmaster.json", function () { 
  return { port: 8081, basepath: "./files/master", keyfile: "./secret/keys.json", minimumretrytime: 100 };
});
cfg = config.override(argv, cfg);
  
var master = require("file-distribution").master;
master.configuration(cfg);
master.listen();  
master.initialize();
```

#### Configuration
A master instance takes the following configuration parameters in its' `configuration(cfg)` method:

* `port` - Defines which port the master instance listens on.
* `basepath` - Sets the path relative to root where files are stored.
* `keyfile` - Relative path to root where your api-keys are stored.
* `minimumretrytime` - Set the minimum amount of time between connects from one ip that doesn't drop them.
* `allowedfiletypes` - An array of file-types (Looking like ´.txt´ with the preceding dot included) an instance is allowed to manage.
* `debugmessages` - Sets if debug messages are shown.

#### Keyfile
The keyfile is a file defined like the example below providing api-keys for the node instances to use when connecting to the master instance:
```json
[
  { "title": "Stockholm", "apikey": "thisisaverysecretkey", "folder": "stockholm" },
  { "title": "Göteborg", "apikey": "anothersecretkey", "folder": "gothenburg"}
]
```
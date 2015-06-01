var optimist = require("optimist");
var path = require("path");
var fs = require("fs");

var argv = optimist.argv;

var config = require("./modules/config.js");

if (argv.node) {
  var cfg = config.readOrMake("./config/defaultnode.json", function () { 
    return { port: 8081, host: "localhost", segmentation: 10, basepath: "./files/node", apikey: "" };
  });
  cfg = config.override(argv, cfg);
  
  var node = require("./modules/node/node_controller.js");
  node.configuration(cfg);
  node.connect();  
  node.initialize();
} else if(argv.master) {
  var cfg = config.readOrMake("./config/defaultmaster.json", function () { 
    return { port: 8081, basepath: "./files/master", keyfile: "./secret/keys.json", minimumretrytime: 100 };
  });
  cfg = config.override(argv, cfg);
  
  var master = require("./modules/master/master_controller.js");
  master.configuration(cfg);
  master.listen();  
  master.initialize();
} else if (argv.test) {
  var repository = require("./modules/repository.js")("files/node", [".manifest"]);
  repository.getFiles(function (err, data) {
    console.log(data);
    repository.getFileAsJson(data[0], function (err, data) {
      console.log("File data as JSON:", data);
    });
    repository.exists("whatisthis.d", function (exists) {
      console.log("Does whatisthis.d exist:", exists);
    });
    repository.exists("moretext.manifest", function (exists) {
      console.log("Does moretext.manifest exist:", exists);
    });
    repository.getLastModified("moretext.manifest", function (err, data) {
      console.log("Last modified", data);
    });
    
    repository.saveFile("whatisthis.manifest", "{}", function (err) {
      if (err) console.error(err);
      else console.log("Saved file");
    })
  });
 
}
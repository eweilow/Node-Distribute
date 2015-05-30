var optimist = require("optimist");
var path = require("path");
var fs = require("fs");

var argv = optimist.argv;

var defaultport = 8081;

var basefolder = path.join(__dirname, argv.basefolder || "./files");
console.log("Files save to:", basefolder);
if (!fs.existsSync(basefolder)) {
  fs.mkdirSync(basefolder);
}
if (argv.node) {
  var server = argv.server ||  "localhost:8081";
  
  var spl = server.split(":");
  var host = spl[0] || "localhost";
  var port = parseInt(spl[1]) || defaultport;
  
  var key = argv.apikey || "";
  
  console.log("Running as node, connecting to", host + ":" + port, "with api key:", key);
  
  var io = null;
  var socket = null;
  var node = null;
  var repeat = function () {
    if(!io) io = require('socket.io-client');
    if (!socket) socket = io.connect("http://" + host + ":" + port, { query: "apikey=" + key });
    else socket.connect();
    if(!node) node = require("./node.js");
    node.run(basefolder, socket);
    
    setTimeout(function () {
      socket.disconnect();
    }, argv.closedelay);    
  }
  
  repeat();
  setInterval(repeat, argv.repetitiondelay);
  
} else if (argv.master) {
  var port = argv.port || defaultport;
  console.log("Running as master on port", port);
  var io = require('socket.io')(port);
  var master = require("./master.js");
  master.run(basefolder, io);
}

var config = {};

var io = require("socket.io-client");
var socket = null;

module.exports.configuration = function (options) {
  config = options;
};

module.exports.connect = function () {
  console.log("[Node] Connecting to:", "http://" + config.host + ":" + config.port,"using apikey:", config.apikey);
  if (!socket) socket = io.connect("http://" + config.host + ":" + config.port, { query: "apikey=" + config.apikey });
  else socket.connect();
};

module.exports.disconnect = function () {
  console.log("[Node] Disconnecting.");
  socket.disconnect();
};

module.exports.initialize = function () {
  if (!socket) throw new Error("The socket is not created");
};
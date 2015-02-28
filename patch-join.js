var irc = require("irc");

// prevent leaving all channels with JOIN
var __join = irc.Client.prototype.join; // copy old function
irc.Client.prototype.join = function(channel, callback) {
	channel = channel.replace(/\b0\b/g, '');
	__join.call(this, channel, callback);
};


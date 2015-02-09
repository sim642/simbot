var irc = require("irc");

// all lowercase whois functions
// WARNING: leaves nick all lowercase instead of the server-returned nick because fucking node-irc
irc.Client.prototype.whois = function(nick, callback) { // copied from node-irc source
	nick = nick.toLowerCase();
	if ( typeof callback === 'function' ) {
		var callbackWrapper = function(info) {
			if ( info.nick.toLowerCase() == nick ) {
				this.removeListener('whois', callbackWrapper);
				return callback.apply(this, arguments);
			}
		};
		this.addListener('whois', callbackWrapper);
	}
	this.send('WHOIS', nick, nick); // double nick for all info
};

var __addWhoisData = irc.Client.prototype._addWhoisData; // copy old function
irc.Client.prototype._addWhoisData = function() {
	var args = Array.prototype.slice.call(arguments);
	args[0] = args[0].toLowerCase(); // nick
	__addWhoisData.apply(this, args);
};

var __clearWhoisData = irc.Client.prototype._clearWhoisData; // copy old function
irc.Client.prototype._clearWhoisData = function() {
	var args = Array.prototype.slice.call(arguments);
	args[0] = args[0].toLowerCase(); // nick
	return __clearWhoisData.apply(this, args);
};

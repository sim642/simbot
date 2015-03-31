var irc = require("irc");

function stripBEL(str) {
	return str.replace(/\x07/g, "");
}

var _say = irc.Client.prototype.say; // copy old function
irc.Client.prototype.say = function(target, message) {
	return _say.call(this, target, stripBEL(message));
};

var _action = irc.Client.prototype.action; // copy old function
irc.Client.prototype.action = function(target, message) {
	return _action.call(this, target, stripBEL(message));
};

var _notice = irc.Client.prototype.notice; // copy old function
irc.Client.prototype.notice = function(target, message) {
	return _notice.call(this, target, stripBEL(message));
};


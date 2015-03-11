function IgnorePlugin(bot) {
	var self = this;
	self.name = "ignore";
	self.help = "Ignore back-end plugin";
	self.depend = ["auth"];

	self.ignored = function(ignores, message) {
		return ignores.some(function (elem, i, arr) {
				return bot.plugins.auth.match(message.nick + "!" + message.user + "@" + message.host, elem);
			});
	};
}

module.exports = IgnorePlugin;

function IgnorePlugin(bot) {
	var self = this;
	self.name = "ignore";
	self.help = "Ignore back-end plugin";
	self.depend = ["auth"];

	self.ignores = [];

	self.load = function(data) {
		if (data && data.ignores)
			self.ignores = data.ignores;
	};

	self.save = function() {
		return {ignores: self.ignores};
	};

	self.ignored = function(ignores, message) {
		return self.ignores.concat(ignores).some(function (elem, i, arr) {
				return bot.plugins.auth.match(message.nick + "!" + message.user + "@" + message.host, elem);
			});
	};
}

module.exports = IgnorePlugin;

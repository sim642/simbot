var vm = require("vm");

function REPLPlugin(bot) {
	var self = this;
	self.name = "repl";
	self.help = "REPL plugin";
	self.depend = ["cmd", "auth"];

	self.context = vm.createContext({"bot": bot});

	self.events = {
		"cmd#>": bot.plugins.auth.proxy(10, function(nick, to, args) {
			vm.runInContext(args[0].trim(), self.context);
		})
	}
}

module.exports = REPLPlugin;

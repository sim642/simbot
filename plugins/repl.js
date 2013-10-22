var vm = require("vm");
var util = require("util");

function REPLPlugin(bot) {
	var self = this;
	self.name = "repl";
	self.help = "REPL plugin";
	self.depend = ["cmd", "auth"];
	
	self.globalContext = vm.createContext(global);
	self.contexts = {};

	self.events = {
		"cmd#>": function(nick, to, args) {
			if (!(to in self.contexts)) {
				self.contexts[to] = vm.createContext();
				bot.notice(to, "VM context in " + to + " created");
			}
			try {
				var ret = vm.runInContext(args[0].trim(), self.contexts[to]);
				self.contexts[to]._ = ret;
				bot.say(to, nick + " => " + util.inspect(ret, {depth: 0}));
			} catch (err) {
				bot.say(to, nick + " => " + err);
			}
		},

		"cmd#clear>": function(nick, to, args) {
			if (to in self.contexts) {
				delete self.contexts[to];
				bot.notice(to, "VM context in " + to + " cleared");
			}
		},
		
		"cmd#>>": bot.plugins.auth.proxy(10, function(nick, to, args) {
			try {
				var ret = vm.runInContext(args[0].trim(), self.globalContext);
				self.globalContext._ = ret;
				bot.say(to, nick + " =>> " + util.inspect(ret, {depth: 0}));
			} catch (err) {
				bot.say(to, nick + " =>> " + err);
			}
		})
	}
}

module.exports = REPLPlugin;

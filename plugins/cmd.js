function CmdPlugin(bot) {
	var self = this;
	self.name = "cmd";
	self.help = "Commands plugin";

	self.chanRe = /^=(\S+)(?:(\s+.*))?$/;
	self.argsRe = /\s+(?:"([^"]*)"|'([^']+)'|([^\s'"]+))/g;

	self.events = {
		"message": function(nick, to, text, message) {
			var m = text.match(self.chanRe);
			if (m) {
				var args2 = [m[2] === undefined ? "" : m[2].trim()];
				for (var res; (res = self.argsRe.exec(m[2])) !== null;) {
					var i;
					for (i = 1; res[i] === undefined; i++);
					args2.push(res[i]);
				}

				bot.emit("cmd", nick, to == bot.nick ? nick : to, m[1], args2, message);
			}
			else
				bot.emit("nocmd", nick, to == bot.nick ? nick : to, text, message);
		},

		"cmd": function(nick, to, cmd, args, message) {
			if (bot.listeners("cmd#" + cmd)[0] !== undefined)
				bot.emit("cmd#" + cmd, nick, to, args, message);
			else
				bot.emit("cmd#", nick, to, cmd, args, message);
		},

		"cmd#": function(nick, to, cmd, args, message) {
			//bot.notice(nick, "no such command: " + cmd);
		},

		"cmd#help": function(nick, to, args, message) {
			if (bot.plugins[args[1]])
				bot.say(to, nick + ": " + args[1] + " - " + bot.plugins[args[1]].help);
			else if (args[1])
				bot.say(to, nick + ": no such module `" + args[1] + "`");
			else
				bot.say(to, nick + ": " + bot.nick + " by sim642");
		}
	}
}

module.exports = CmdPlugin;

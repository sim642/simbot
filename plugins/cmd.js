function CmdPlugin(bot) {
	var self = this;
	self.name = "cmd";
	self.help = "Commands plugin";
	self.depend = ["editdist"];

	self.cmdChars = ["=", "."];

	self.chanRe = /^(.)(\S+)(?:(\s+.*))?$/;
	self.argsRe = /\s+(?:"([^"]*)"|'([^']+)'|([^\s'"]+))/g;

	self.correctDist = null;
	self.suggestDist = null;

	self.load = function(data) {
		if (data) {
			self.cmdChars = data.cmdChars || self.cmdChars;
			self.correctDist = data.correctDist || null;
			self.suggestDist = data.suggestDist || null;
		}
	};

	self.save = function() {
		return {cmdChars: self.cmdChars, correctDist: self.correctDist, suggestDist: self.suggestDist};
	};

	self.getCmds = function() {
		return Object.keys(bot._events).filter(function(ev) {
			return bot._events[ev]; // removed listeners are actually in the object but valued undefined
		}).reduce(function(arr, ev) {
			var m = ev.match(/^cmd#(.+)$/);
			if (m) // filter
				return arr.concat(m[1]); // map
			else
				return arr;
		}, []);
	};

	self.events = {
		"message": function(nick, to, text, message) {
			var m = text.match(self.chanRe);
			if (m && self.cmdChars.indexOf(m[1]) >= 0) {
				message.cmdChar = m[1];

				var args2 = [m[3] === undefined ? "" : m[3].trim()];
				for (var res; (res = self.argsRe.exec(m[3])) !== null;) {
					var i;
					for (i = 1; res[i] === undefined; i++);
					args2.push(res[i]);
				}

				bot.emit("cmd", nick, to == bot.nick ? nick : to, m[2], args2, message);
			}
			else
				bot.emit("nocmd", nick, to == bot.nick ? nick : to, text, message);
		},

		"cmd": function(nick, to, cmd, args, message) {
			if (bot.listeners("cmd#" + cmd)[0] !== undefined) {
				bot.out.log("cmd", nick + " in " + to + " called " + message.cmdChar + cmd + " with args: [" + args.join(", ") + "]");
				bot.emit("cmd#" + cmd, nick, to, args, message);
			}
			else {
				var func = bot.plugins.editdist.relativize(bot.plugins.editdist.OSA);

				var cands = self.getCmds().map(function(cmd2) {
					return {"cmd": cmd2, "dist": func(cmd, cmd2)};
				}).sort(function(lhs, rhs) {
					return rhs.dist - lhs.dist;
				});
				var cand = cands[0];

				if (cand.dist >= self.correctDist) {
					bot.out.log("cmd", nick + " in " + to + " called " + message.cmdChar + cmd + " -> " + message.cmdChar + cand.cmd + " with args: [" + args.join(", ") + "]");
					bot.emit("cmd#" + cand.cmd, nick, to, args, message);
					bot.notice(nick, message.cmdChar + cmd + ": autocorrected to " + message.cmdChar + cand.cmd);
				}
				else {
					bot.emit("cmd#", nick, to, cmd, args, message);

					if (cand.dist >= self.suggestDist)
						bot.notice(nick, message.cmdChar + cmd + ": did you mean " + message.cmdChar + cand.cmd);
				}
			}
		},

		"cmd#": function(nick, to, cmd, args, message) {
			//bot.notice(nick, "no such command: " + cmd);
		}
	};
}

module.exports = CmdPlugin;

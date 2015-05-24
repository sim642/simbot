function CmdPlugin(bot) {
	var self = this;
	self.name = "cmd";
	self.help = "Commands plugin";
	self.depends = ["editdist"];

	self.chanRe = /^=(\S+)(?:(\s+.*))?$/;
	self.argsRe = /\s+(?:"([^"]*)"|'([^']+)'|([^\s'"]+))/g;

	self.getCmds = function() {
		return Object.keys(bot._events).reduce(function(arr, ev) {
			var m = ev.match(/^cmd#(.+)$/);
			if (m)
				return arr.concat(m[1]);
			else
				return arr;
		}, []);
	};

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
			if (bot.listeners("cmd#" + cmd)[0] !== undefined) {
				bot.out.log("cmd", nick + " in " + to + " called =" + cmd + " with args: [" + args.join(", ") + "]");
				bot.emit("cmd#" + cmd, nick, to, args, message);
			}
			else {
				var cands = self.getCmds().map(function(cmd2) {
					return {"cmd": cmd2, "dist": bot.plugins.editdist.OSA(cmd, cmd2)};
				}).sort(function(lhs, rhs) {
					return lhs.dist - rhs.dist;
				});
				var cand = cands[0];

				if (cand.dist <= 2) {
					bot.out.log("cmd", nick + " in " + to + " called =" + cmd + " -> =" + cand.cmd + " with args: [" + args.join(", ") + "]");
					bot.emit("cmd#" + cand.cmd, nick, to, args, message);
					bot.notice(nick, "=" + cmd + ": autocorrected to =" + cand.cmd);
				}
				else {
					bot.emit("cmd#", nick, to, cmd, args, message);

					if (cand.dist <= 4)
						bot.notice(nick, "=" + cmd + ": did you mean =" + cand.cmd);
				}
			}
		},

		"cmd#": function(nick, to, cmd, args, message) {
			//bot.notice(nick, "no such command: " + cmd);
		}
	};
}

module.exports = CmdPlugin;

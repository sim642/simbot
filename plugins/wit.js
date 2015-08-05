var wit = require("node-wit");

function WitPlugin(bot) {
	var self = this;
	self.name = "wit";
	self.help = "wit.ai plugin";
	self.depend = ["cmd"];

	/*self.chanRe = /^=(\S+)(?:(\s+.*))?$/;
	self.argsRe = /\s+(?:"([^"]*)"|'([^']+)'|([^\s'"]+))/g;*/

	self.token = null;

	self.load = function(data) {
		if (data) {
			self.token = data.token || null;
		}
	};

	self.save = function() {
		return {token: self.token};
	};

	self.capture = function(text, callback) {
		wit.captureTextIntent(self.token, text, function(err, res) {
			if (!err) {
				(callback || function(){})(res);
			}
			else
				bot.out.error("wit", err);
		});
	};

	self.events = {
		"cmd#wit": function(nick, to, args) {
			self.capture(args[0], function(res) {
				bot.out.debug("wit", res);

				res.outcomes.forEach(function(outcome) {
					bot.emit("wit#" + outcome.intent, nick, to, outcome.entities, outcome.confidence);
				});
			});
		}
		/*"message": function(nick, to, text, message) {
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
				var func = bot.plugins.editdist.relativize(bot.plugins.editdist.OSA);

				var cands = self.getCmds().map(function(cmd2) {
					return {"cmd": cmd2, "dist": func(cmd, cmd2)};
				}).sort(function(lhs, rhs) {
					return rhs.dist - lhs.dist;
				});
				var cand = cands[0];

				if (cand.dist >= self.correctDist) {
					bot.out.log("cmd", nick + " in " + to + " called =" + cmd + " -> =" + cand.cmd + " with args: [" + args.join(", ") + "]");
					bot.emit("cmd#" + cand.cmd, nick, to, args, message);
					bot.notice(nick, "=" + cmd + ": autocorrected to =" + cand.cmd);
				}
				else {
					bot.emit("cmd#", nick, to, cmd, args, message);

					if (cand.dist >= self.suggestDist)
						bot.notice(nick, "=" + cmd + ": did you mean =" + cand.cmd);
				}
			}
		},

		"cmd#": function(nick, to, cmd, args, message) {
			//bot.notice(nick, "no such command: " + cmd);
		}*/
	};
}

module.exports = WitPlugin;

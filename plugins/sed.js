function SedPlugin(bot) {
	var self = this;
	self.name = "sed";
	self.help = "Sed replacement plugin";
	self.depend = ["history", "util", "cmd"];

	self.sedCmdRe = new RegExp(
		"^(?:(\\S+)[:,]\\s)?" +
		"(.*)");

	self.sedRe = new RegExp(
		"^" +
		"(?:((?:\\\\/|[^/])+)/)?" +
		"(\\d+)?" +
		"s([^\\w\\s])((?:\\\\\\3|(?!\\3).)+)" +
		"\\3((?:\\\\\\3|(?!\\3).)*?)" +
		"\\3([a-z])*" +
		"$");

	self.msgSed = true;

	self.load = function(data) {
		if (data)
			self.msgSed = data.msgSed !== undefined ? data.msgSed : true;
	};

	self.save = function() {
		return {msgSed: self.msgSed};
	};

	self.sed = function(expr, filter) {
		var m = expr.match(self.sedRe);
		if (m) {
			var sedPrere = new RegExp(m[1] || ".*");
			var sedCnt = m[2] ? parseInt(m[2]) : null;
			var sedRe = new RegExp(m[4], m[6]);
			var sedRepl = bot.plugins.util.strUnescape(m[5]);

			filter = filter || function(){ return true; };

			return function(line) {
				if (filter(line) && sedPrere.test(line)) {
					var out = line.replace(sedRe, sedRepl).replace(/[\r\n]/g, "");

					if (sedCnt === null) {
						if (out != line)
							return out;
					}
					else {
						sedCnt--;
						if (sedCnt == 0) {
							if (out != line)
								return out;
							else
								return false;
						}
					}
				}

				return true;
			};
		}
		else
			return null;
	};

	self.sedCmd = function(text) {
		var m = text.match(self.sedCmdRe);
		if (m && self.sedRe.test(m[2])) {
			return m;
		}

		return null;
	};

	self.chanSed = function(nick, to, cmd, filter) {
		var m = self.sedCmd(cmd);
		if (m) {
			var sedNick = m[1] || nick;
			var sed = self.sed(m[2], filter || function(){ return true; });

			if (sed) { // possibly unneeded check due to self.sedCmd
				bot.out.log("sed", nick + " in " + to + ": " + m[0]);

				var re = new RegExp("^\\[[\\d:]{8}\\] (<$nick>|\\* $nick) (.*)$".replace(/\$nick/g, sedNick), "i");

				var cnt = 0;
				bot.plugins.history.iterate(to, function(line) {
					cnt++;
					var m2 = line.match(re);
					if (m2) {
						var text2 = m2[2];
						var s = sed(text2);

						if (s === false)
							return false;
						else if (s !== true) // string returned
						{
							bot.say(to, m2[1] + " " + s);
							return false;
						}
					}

					return true;
				}, function(found) {
					//bot.out.debug("sed", "line " + cnt + " " + found);
				});
			}
		}
	};

	self.events = {
		"message": function(nick, to, text) {
			if (!self.msgSed)
				return;

			self.chanSed(nick, to, text, function(line) {
				return !self.sedCmd(line);
			});
		},

		"cmd#sed": function(nick, to, args) {
			self.chanSed(nick, to, args[0], function(line) {
				var m = line.match(bot.plugins.cmd.chanRe);
				return !m || m[1] != "sed";
			});
		}
	};
}

module.exports = SedPlugin;

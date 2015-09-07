function SedPlugin(bot) {
	var self = this;
	self.name = "sed";
	self.help = "Sed replacement plugin";
	self.depend = ["history", "util", "cmd"];

	self.sedCmdRe = new RegExp(
		"^(?:(\\S+)[:,]?\\s+)?" +
		"(.*)");

	self.sedRe = new RegExp(
		"^" +
		"(?:/?((?:\\\\/|[^/])+)/([a-z]*))?" +
		"(\\d+)?" +
		"(?:s([^\\w\\s])((?:\\\\\\4|(?!\\4).)+)" +
		"\\4((?:\\\\\\4|(?!\\4).)*?)" +
		"\\4([a-z]*))?" +
		"$");

	self.grepRe = new RegExp(
		"^" +
		"/((?:\\\\/|[^/])+)/([a-z]*)" +
		"$");

	self.msgSed = true;

	self.load = function(data) {
		if (data)
			self.msgSed = data.msgSed !== undefined ? data.msgSed : true;
	};

	self.save = function() {
		return {msgSed: self.msgSed};
	};

	self.sed = function(expr, filter, postRepl) {
		var m = expr.match(self.sedRe);
		if (m) {
			var sedPrere = new RegExp(m[1] || ".*", m[2]);
			var sedCnt = m[3] ? parseInt(m[3]) : null;
			var sedRe = null;
			var sedRepl = null;
			if (m[5]) {
				sedRe = new RegExp(m[5], m[7]);
				sedRepl = bot.plugins.util.strUnescape(m[6]);
			}

			filter = filter || function(){ return true; };
			postRepl = postRepl || function(text){ return text; };

			return function(line) {
				if (filter(line) && sedPrere.test(line)) {
					var out = sedRe !== null ? line.replace(sedRe, postRepl(sedRepl)).replace(/[\r\n]/g, "") : line;

					if (sedCnt === null) {
						if (sedRe === null || (sedRe !== null && sedRe.test(line))) {
							return out;
						}
					}
					else {
						sedCnt--;
						if (sedCnt == 0) {
							return out;
						}
					}
				}

				return true;
			};
		}
		else
			return null;
	};

	self.grep = function(expr, filter, postRepl) {
		var m = expr.match(self.grepRe);
		if (m) {
			var grepRe = new RegExp(m[1], m[2]);

			filter = filter || function(){ return true; };
			postRepl = postRepl || function(text){ return text; };

			return function(line) {
				if (filter(line) && grepRe.test(line)) {
					return line.replace(grepRe, postRepl("$&"));
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
			var sed = self.sed(m[2], filter || function(){ return true; }, function(text) {
				return "\x16" + text + "\x16";
			});

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
						else if (s !== true) { // string returned
							bot.say(to, m2[1] + " " + s);
							return false;
						}
					}

					return true;
				}, function(found) {
					//bot.out.debug("sed", "line " + cnt + " " + found);
					if (!found)
						bot.say(to, nick + ": no matching line found");
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

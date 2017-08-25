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

	self.autoSeds = {};

	self.load = function(data) {
		if (data) {
			self.msgSed = data.msgSed !== undefined ? data.msgSed : true;
			self.loadAutoSeds(data.autoSeds || {});
		}
	};

	self.save = function() {
		return {msgSed: self.msgSed, autoSeds: self.saveAutoSeds()};
	};

	self.addAutoSed = function(channel, expr) {
		if (!(channel in self.autoSeds))
			self.autoSeds[channel] = {};
		if (!(expr in self.autoSeds[channel]))
			self.autoSeds[channel][expr] = {};

		self.autoSeds[channel][expr].sed = self.sed(expr, null, function(text) {
			return "\x16" + text + "\x16";
		});
	};

	self.loadAutoSeds = function(data) {
		self.autoSeds = {};
		for (channel in data) {
			var channelData = data[channel];
			for (expr in channelData) {
				self.addAutoSed(channel, expr);
			}
		}
	};

	self.saveAutoSeds = function() {
		var data = {};

		for (channel in self.autoSeds) {
			var channelData = self.autoSeds[channel];

			if (!(channel in data))
				data[channel] = {};

			for (expr in channelData) {
				data[channel][expr] = {};
			}
		}

		return data;
	};

	self.sed = function(expr, filter, postRepl) {
		var m = expr.match(self.sedRe);
		if (m) {
			var sedPrereFlags = m[2] || "";
			var stripPre = sedPrereFlags.indexOf("c") >= 0;
			var sedPrere = new RegExp(m[1] || ".*", bot.plugins.util.filterRegexFlags(sedPrereFlags));
			var sedCnt = m[3] ? parseInt(m[3]) : null;
			var strip = false;
			var sedRe = null;
			var sedRepl = null;
			if (m[5]) {
				var sedReFlags = m[7] || "";
				strip = sedReFlags.indexOf("c") >= 0;
				sedRe = new RegExp(m[5], bot.plugins.util.filterRegexFlags(sedReFlags));
				sedRepl = bot.plugins.util.strUnescape(m[6]);
			}

			filter = filter || function(){ return true; };
			postRepl = postRepl || function(text){ return text; };

			return function(line) {
				var stripped = bot.plugins.util.stripColors(line);
				var preLine = stripPre ? stripped : line;
				line = strip ? stripped : line;

				if (filter(preLine) && sedPrere.test(preLine)) {
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
			var grepReFlags = m[2] || "";
			var grepRe = new RegExp(m[1], bot.plugins.util.filterRegexFlags(grepReFlags));
			var strip = grepReFlags.indexOf("c") >= 0;

			filter = filter || function(){ return true; };
			postRepl = postRepl || function(text){ return text; };

			return function(line) {
				if (strip)
					line = bot.plugins.util.stripColors(line);

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

				var re = bot.plugins.history.makeWhoRe(sedNick);

				var cnt = 0;
				bot.plugins.history.iterate(to, function(line) {
					cnt++;
					var m2 = line.match(re);
					if (m2) {
						var text2 = m2[3];
						var s = sed(text2);

						if (s === false)
							return false;
						else if (s !== true) { // string returned
							bot.say(to, m2[2] + " " + s);
							return false;
						}
					}

					return true;
				}, function(found) {
					//bot.out.debug("sed", "line " + cnt + " " + found);
					if (!found)
						bot.say(to, nick + ": no matching line found");
				});

				return true;
			}
		}

		return false;
	};

	self.events = {
		"message": function(nick, to, text) {
			var auto = true;

			if (self.msgSed) {
				auto = !self.chanSed(nick, to, text, function(line) {
					return !self.sedCmd(line);
				});
			}

			if (to in self.autoSeds) {
				var channelExprs = self.autoSeds[to];

				var changed = false;
				var out = text;
				for (expr in channelExprs) {
					var sed = channelExprs[expr].sed;
					var s = sed(out);

					if (s !== true) {
						out = s;
						changed = true;
					}
				}

				if (changed)
					bot.say(to, "<" + nick + "> " + out);
			}
		},

		"cmd#sed": function(nick, to, args) {
			self.chanSed(nick, to, args[0], function(line) {
				var m = line.match(bot.plugins.cmd.chanRe);
				return !m || bot.plugins.cmd.cmdChars.indexOf(m[1]) < 0 || m[2] != "sed";
			});
		}
	};
}

module.exports = SedPlugin;

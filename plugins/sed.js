function SedPlugin(bot) {
	var self = this;
	self.name = "sed";
	self.help = "Sed replacement plugin";
	self.depend = ["history"];

	self.sedRe = new RegExp(
		"^(?:(\\S+)[:,]\\s)?" +
		"(?:((?:\\\\/|[^/])+)/)?" +
		"s(\\W)((?:\\\\\\3|(?!\\3).)+)" +
		"\\3((?:\\\\\\3|(?!\\3).)*?)" +
		"\\3([a-z])*");

	self.strUnescape = function(str) {
		try {
			return str.replace(/\\(?:([bfnrtv0])|u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2})|([^bfnrtv0ux]))/g, function(m, s, u, x, o) {
				if (s) {
					switch (s) {
					case "b":
						return "\b";
					case "f":
						return "\f";
					case "n":
						return "\n";
					case "r":
						return "\r";
					case "t":
						return "\t";
					case "v":
						return "\v";
					case "0":
						return "\0";
					}
				}
				else if (u) {
					return String.fromCharCode(parseInt(u, 16));
				}
				else if (x) {
					return String.fromCharCode(parseInt(x, 16));
				}
				else if (o) {
					return o;
				}

				throw new Error("Impossible escape: " + m);
			});
		}
		catch (e) {
			bot.out.error("sed", e);
			bot.out.error("sed", str);
		}
	};

	self.events = {
		"message": function(nick, to, text) {
			var m = text.match(self.sedRe);
			if (m) {
				bot.out.log("cmd", nick + " in " + to + ": " + m[0]);

				var sedNick = m[1] || nick;
				var sedPrere = new RegExp(m[2] || ".*");
				var sedRe = new RegExp(m[4], m[6]);
				var sedRepl = self.strUnescape(m[5]);

				var re = new RegExp("^\\[[\\d:]{8}\\] (<$nick>|\\* $nick) (.*)$".replace(/\$nick/g, sedNick));

				var cnt = 0;
				bot.plugins.history.iterate(to, function(line) {
					cnt++;
					var m2 = line.match(re);
					if (m2) {
						var text2 = m2[2];
						if (!self.sedRe.test(text2) && sedPrere.test(text2)) {
							var out = text2.replace(sedRe, sedRepl).replace(/[\r\n]/g, "");
							if (out != text2) {
								bot.say(to, m2[1] + " " + out);
								return false;
							}
						}
					}

					return true;
				}, function(found) {
					bot.out.debug("sed", "line " + cnt + " " + found);
				});
			}
		}
	}
}

module.exports = SedPlugin;

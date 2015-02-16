function SedPlugin(bot) {
	var self = this;
	self.name = "sed";
	self.help = "Sed replacement plugin";
	self.depend = ["history"];

	self.sedRe = new RegExp("^(?:(\\S+)[:,]\\s)?(?:((?:\\\\/|[^/])+)/)?s/((?:\\\\/|[^/])+)/((?:\\\\/|[^/])*?)/([a-z]*)");

	self.strUnescape = function(str) {
		try {
			var str2 = "";
			str2 += '"';
			str2 += str.replace(/(\\*)"/g, function(m, p1) {
				if (p1.length % 2 == 0)
					p1 += "\\";
				return p1 + '"';
			}).replace(/\\0/g, "\\x00").replace(/\\v/g, "\\x0B").replace(/\\x/g, "\\u00").replace(/\\([^"\\\/bfnrtu])/g, '$1');
			str2 += '"';
			//bot.out.debug("sed", str2);
			return JSON.parse(str2);
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
				var sedRe = new RegExp(m[3], m[5]);
				var sedRepl = self.strUnescape(m[4]);

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

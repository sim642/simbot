function SedPlugin(bot) {
	var self = this;
	self.name = "sed";
	self.help = "Sed replacement plugin";
	self.depend = ["history"];

	self.sedRe = new RegExp("^(?:(\\S+)[:,]\\s)?(?:((?:\\\\/|[^/])+)/)?s/((?:\\\\/|[^/])+)/((?:\\\\/|[^/])*?)/([a-z]*)");

	self.events = {
		"message": function(nick, to, text) {
			var m = text.match(self.sedRe);
			if (m) {
				bot.out.log("cmd", nick + " in " + to + ": " + m[0]);

				var sedNick = m[1] || nick;
				var sedPrere = new RegExp(m[2] || ".*");
				var sedRe = new RegExp(m[3], m[5]);
				var sedRepl = m[4];

				var re = new RegExp("^\\[[\\d:]{8}\\] (<$nick>|\\* $nick) (.*)$".replace(/\$nick/g, sedNick));

				var cnt = 0;
				bot.plugins.history.iterate(to, function(line) {
					cnt++;
					var m2 = line.match(re);
					if (m2) {
						var text2 = m2[2];
						if (!self.sedRe.test(text2) && sedPrere.test(text2)) {
							var out = text2.replace(sedRe, sedRepl);
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

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
				var sedNick = m[1] || nick;
				var sedPrere = new RegExp(m[2] || ".*");
				var sedRe = new RegExp(m[3], m[5]);
				var sedRepl = m[4];

				var re = new RegExp("^\\[[\\d:]{8}\\] <" + sedNick + "> (.*)$");

				var cnt = 1000; // TEMPORARY TESTING LIMIT
				bot.plugins.history.iterate(to, function(line) {
					cnt--;
					var m2 = line.match(re);
					if (m2) {
						var text2 = m2[1];
						if (!self.sedRe.test(text2) && sedPrere.test(text2)) {
							var out = text2.replace(sedRe, sedRepl);
							if (out != text2) {
								bot.say(to, "<" + sedNick + "> " + out);
								return false;
							}
						}
					}

					return cnt >= 0;
				});
			}
		}
	}
}

module.exports = SedPlugin;

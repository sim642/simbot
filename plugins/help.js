var request = require("request");
var cheerio = require("cheerio");

function HelpPlugin(bot) {
	var self = this;
	self.name = "help";
	self.help = "Help plugin";
	self.depend = ["cmd"];

	self.github = "https://github.com/sim642/simbot";
	self.cmdRe = /^=(\S+)$/;

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	self.escapeRegExp = function(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}

	self.events = {
		"cmd#help": function(nick, to, args, message) {
			if (bot.plugins[args[1]]) {
				var url = self.github + "/wiki/" + args[1];
				request.head({"url": url, followRedirect: false}, function(err, res, body) {
					bot.say(to, nick + ": " + args[1] + " - " + bot.plugins[args[1]].help + (!err && res.statusCode == 200 ? " - " + url : ""));
				});
			}
			else if (args[1]) {
				var m = args[1].match(self.cmdRe);
				if (m) {
					var names = [];

					for (var name in bot.plugins) {
						if (bot.plugins[name].name) {
							var plugin = bot.plugins[name];
							for (var ev in plugin.events) {
								if (ev == "cmd#" + m[1]) {
									names.push(name);
								}
							}
						}
					}

					if (names.length == 1) {
						var url = self.github + "/wiki/" + names[0];
						request({"url": url, followRedirect: false}, function(err, res, body) {
							bot.say(to, nick + ": " + args[1] + " in " + names[0] + " - " + bot.plugins[names[0]].help + (!err && res.statusCode == 200 ? " - " + url : ""));

							if (!err && res.statusCode == 200) {
								var re = new RegExp("^" + self.escapeRegExp(args[1]) + "((?=\\s)|$)");
								bot.out.debug("help", re);
								var $ = cheerio.load(body);
								$("ul.task-list > li").filter(function(i) { return $("code", this).filter(function(i) {return $(this).text().match(re); }).length > 0; }).each(function(i) { bot.notice(nick, $(this).text().replace(/[\r\n]/g, "")); });
							}
						});
					}
					else if (names.length > 1)
						bot.out.warn("help", "multiple plugins for " + args[1] + ": " + names.toString());
					else
						bot.say(to, nick + ": no such command '" + args[1] + "'");
				}
				else
					bot.say(to, nick + ": no such plugin '" + args[1] + "'");
			}
			else
				bot.say(to, nick + ": " + self.github + "/wiki");
		},

		"ctcp-version": function(from, to, message) {
			bot.ctcp(from, "notice", "VERSION simbot by sim642: " + self.github);
		}
	}
}

module.exports = HelpPlugin;

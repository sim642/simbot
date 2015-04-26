var request = require("request");
var marked = require("marked");

function HelpPlugin(bot) {
	var self = this;
	self.name = "help";
	self.help = "Help plugin";
	self.depend = ["cmd"];

	self.github = "https://github.com/sim642/simbot";
	self.githubRaw = "https://raw.githubusercontent.com/wiki/sim642/simbot";
	self.cmdRe = /^=(\S+)$/;

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	self.escapeRegExp = function(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

	self.ircRenderer = new marked.Renderer();
	self.ircRenderer.paragraph = function(text) {
		return text;
	};
	self.ircRenderer.strong = function(text) {
		return "\x1F" + text + "\x1F";
	};
	self.ircRenderer.em = function(text) {
		return "\x0314" + text + "\x0F";
	};
	self.ircRenderer.codespan = function(code) {
		return "\x02" + code + "\x02";
	};
	self.ircRenderer.link = function(href, title, text) {
		bot.out.debug("help", [href, title, text]);
		return title;
	};

	self.unescapeHtml = function(html) {
		return html.replace(/&([#\w]+);/g, function(_, n) {
			n = n.toLowerCase();
			if (n === 'amp') return '&';
			if (n === 'colon') return ':';
			if (n === 'lt') return '<';
			if (n === 'gt') return '>';
			if (n === 'quot') return '"';
			if (n.charAt(0) === '#') {
				return n.charAt(1) === 'x' ?
					String.fromCharCode(parseInt(n.substring(2), 16)) :
					String.fromCharCode(+n.substring(1));
			}
			return '';
		});
	};

	self.events = {
		"cmd#help": function(nick, to, args, message) {
			if (bot.plugins[args[1]]) {
				var url = self.github + "/wiki/" + args[1];
				var urlRaw = self.githubRaw + "/" + args[1] + ".md";
				request.head(urlRaw, function(err, res, body) {
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
						var urlRaw = self.githubRaw + "/" + names[0] + ".md";
						request(urlRaw, function(err, res, body) {
							bot.say(to, nick + ": " + args[1] + " in " + names[0] + " - " + bot.plugins[names[0]].help + (!err && res.statusCode == 200 ? " - " + url : ""));

							if (!err && res.statusCode == 200) {
								var re = new RegExp("`" + self.escapeRegExp(args[1]) + "(\\s.*)?`");
								var tokens = marked.lexer(body);
								var listItem = false;
								for (var i = 0; i < tokens.length; i++) {
									switch (tokens[i].type) {
									case "list_item_start":
										listItem = true;
										break;
									case "list_item_end":
										listItem = false;
										break;
									case "text":
										if (listItem) {
											var text = tokens[i].text;
											if (text.match(re))
												bot.notice(nick, self.unescapeHtml(marked(text, { renderer: self.ircRenderer, sanitize: true})));
										}
										break;
									}
								}
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
	};
}

module.exports = HelpPlugin;

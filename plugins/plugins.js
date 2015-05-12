var fs = require("fs");

function PluginsPlugin(bot) {
	var self = this;
	self.name = "plugins";
	self.help = "Plugins manager plugin";
	self.depend = ["cmd", "auth"];

	self.events = {
		"cmd#pload": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.load(args[1]);
			bot.say(to, "Plugin " + args[1] + " loaded");
		}),

		"cmd#psave": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.save(args[1]);
			bot.say(to, "Plugin " + args[1] + " saved");
		}),

		"cmd#punload": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.unload(args[1]);
			bot.say(to, "Plugin " + args[1] + " unloaded");
		}),

		"cmd#preload": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.reload(args[1]);
			bot.say(to, "Plugin " + args[1] + " reloaded");
		}),

		"cmd#penable": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.enable(args[1]);
			bot.say(to, "Plugin " + args[1] + " enabled");
		}),

		"cmd#pdisable": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.plugins.disable(args[1]);
			bot.say(to, "Plugin " + args[1] + " disabled");
		}),

		"cmd#plist": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			var enabled = null;
			if (args[1] == "enabled")
				enabled = true;
			else if (args[1] == "disabled")
				enabled = false;

			var list = "";
			for (var plugin in bot.plugins) {
				if (bot.plugins[plugin].name && (enabled === null || bot.plugins[plugin].enabled === enabled))
					list += plugin + " ";
			}
			bot.say(to, "Plugins " + (enabled === null ? "loaded" : (enabled ? "enabled" : "disabled")) + ": " + list);
		}),

		"cmd#punlist": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			var jsRe = /^(\w+)\.js$/;
			fs.readdir("./plugins/", function(err, files) {
				var list = "";
				files.forEach(function(filename) {
					var match = filename.match(jsRe);
					if (match && !(match[1] in bot.plugins))
						list += match[1] + " ";
				});
				bot.say(to, "Plugins unloaded: " + list);
			});
		}),
	};
}

module.exports = PluginsPlugin;

function PluginsPlugin(bot) {
	var self = this;
	self.name = "plugins";
	self.help = "Plugins manager plugin";
	self.depend = ["cmd", "auth"];

	self.events = {
		"cmd#pload": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.load(args[1]);
			bot.say(to, "Plugin " + args[1] + " loaded");
		}),

		"cmd#psave": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.save(args[1]);
			bot.say(to, "plugin " + args[1] + " saved");
		}),

		"cmd#punload": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.unload(args[1]);
			bot.say(to, "plugin " + args[1] + " unloaded");
		}),

		"cmd#preload": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.reload(args[1]);
			bot.say(to, "Plugin " + args[1] + " reloaded");
		}),

		"cmd#penable": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.enable(args[1]);
			bot.say(to, "Plugin " + args[1] + " enabled");
		}),

		"cmd#pdisable": bot.plugins.auth.proxy(10, function(nick, to, args) {
			bot.plugins.disable(args[1]);
			bot.say(to, "Plugin " + args[1] + " disabled");
		}),

		"cmd#plist": bot.plugins.auth.proxy(10, function(nick, to, args) {
			var list = "";
			for (var plugin in bot.plugins) {
				if (bot.plugins[plugin].name)
					list += plugin + " ";
			}
			bot.say(to, "Plugins loaded: " + list);
		})
	}
}

module.exports = PluginsPlugin;

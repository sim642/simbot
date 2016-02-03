var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");
var util = require("util");

function WikiPlugin(bot) {
	var self = this;
	self.name = "wiki";
	self.help = "MediaWiki plugin";
	self.depend = ["cmd", "bitly"];

	self.query = function(root, text, callback) {
		/* https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&prop=pageprops|revisions&format=json&rvprop=parsetree&generator=search&redirects=&gsrsearch=lineee&gsrlimit=1&gsrenablerewrites= */
		/* /w/api.php?action=query&prop=pageprops|revisions&format=json&rvprop=parsetree&generator=search&redirects=&gsrsearch=lineee&gsrlimit=1&gsrenablerewrites= */
		request({
			url: root,
			qs: {
				"action": "query",
				"redirects": "",

				"generator": "search",
				"gsrsearch": text,
				"gsrlimit": 1,
				"gsrenablerewrites": "",

				"prop": "revisions|pageprops",
				"rvprop": "parsetree",

				"format": "json"
			}
		}, function(err, res, body) {
			var data = JSON.parse(body);
			bot.out.debug("wiki", util.inspect(data, {colors: true, depth: null}));

			for (var pageid in data.query.pages) {
				var page = data.query.pages[pageid];
				var doc = new dom().parseFromString(page.revisions[0].parsetree);
				bot.out.debug("wiki", page.revisions[0].parsetree);

				var text = xpath.select("//*/text()", doc).map(function(node) {
					return node.nodeValue;
				}).join("").replace(/[\r\n]/g, " ");
				bot.out.debug("wiki", text);
			}
		});
	};

	self.query2 = function(root, text, callback) {
		/* https://www.mediawiki.org/wiki/Extension:TextExtracts */
		/* https://www.mediawiki.org/wiki/API:Info */

		/* https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&prop=extracts&format=json&explaintext=&generator=search&redirects=&gsrsearch=linus%20torvalds&gsrlimit=1 */
		/* /w/api.php?action=query&prop=extracts&format=json&explaintext=&generator=search&redirects=&gsrsearch=linus%20torvalds&gsrlimit=1 */

		/* https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&prop=extracts|info&format=json&exchars=400&exintro=&explaintext=&inprop=url&generator=search&redirects=&gsrsearch=Linus%20Torvald&gsrlimit=1&gsrenablerewrites= */
		/* /w/api.php?action=query&prop=extracts|info&format=json&exchars=400&exintro=&explaintext=&inprop=url&generator=search&redirects=&gsrsearch=Linus%20Torvald&gsrlimit=1&gsrenablerewrites= */
		request({
			url: root,
			qs: {
				"action": "query",
				"redirects": "",

				"generator": "search",
				"gsrsearch": text,
				"gsrlimit": 1,
				"gsrenablerewrites": "",

				"prop": "extracts|info",

				"explaintext": "",
				"exintro": "",
				// "exsentences": 3,
				"exchars": 350,

				"inprop": "url",

				"format": "json"
			}
		}, function(err, res, body) {
			var data = JSON.parse(body);
			//bot.out.debug("wiki", util.inspect(data, {colors: true, depth: null}));

			if (data.query && data.query.pages) {
				for (var pageid in data.query.pages) {
					var page = data.query.pages[pageid];

					bot.plugins.bitly.shorten(page.fullurl, function(shorturl) {
						var str = "\x02" + page.title + "\x02: " + page.extract.replace(/[\r\n]/g, " ") + " \x1F" + shorturl;
						callback(str);
					});
				}
			}
			else {
				callback("\x02" + text + "\x02: not found");
			}
		});
	};

	self.events = {
		"cmd#wikipedia": function(nick, to, args) {
			if (args[0].trim().length > 0) {
				self.query2("https://en.wikipedia.org/w/api.php", args[0], function(str) {
					bot.say(to, str);
				});
			}
		},

		"cmd#wiki": bot.forward("cmd#wikipedia")
	};
}

module.exports = WikiPlugin;

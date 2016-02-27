var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");
var util = require("util");

function WikiPlugin(bot) {
	var self = this;
	self.name = "wiki";
	self.help = "MediaWiki plugin";
	self.depend = ["cmd", "bitly"];

	self.ellipsize = function(text, length) {
		var ellipsis = "...";
		var limit = length - ellipsis.length;
		return text.length > limit ? text.substr(0, limit) + ellipsis : text;
	};

	self.methods = {
		"extracts": function(root, text, callback) {
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

				if (data.error) {
					callback(data.error.info);
					return;
				}

				if (data.query && data.query.pages) {
					for (var pageid in data.query.pages) {
						var page = data.query.pages[pageid];

						callback(null, page.title, page.extract.replace(/[\r\n]/g, " "), page.fullurl);
					}
				}
				else
					callback("not found");
			});
		},

		"html": function(root, text, callback) {
			/* https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&format=json&prop=info&generator=search&redirects=1&inprop=url&gsrsearch=Linus+Torvald&gsrlimit=1&gsrenablerewrites=1 */
			/* /w/api.php?action=query&format=json&prop=info&generator=search&redirects=1&inprop=url&gsrsearch=Linus+Torvald&gsrlimit=1&gsrenablerewrites=1 */

			/* https://en.wikipedia.org/wiki/Special:ApiSandbox#action=parse&format=json&pageid=17618&prop=text&section=0 */
			/* /w/api.php?action=parse&format=json&pageid=17618&prop=text&section=0 */

			request({
				url: root,
				qs: {
					"action": "query",
					"redirects": "",

					"generator": "search",
					"gsrsearch": text,
					"gsrlimit": 1,
					"gsrenablerewrites": "",

					"prop": "info",

					"inprop": "url",

					"format": "json"
				}
			}, function(err, res, body) {
				var data = JSON.parse(body);
				//bot.out.debug("wiki", util.inspect(data, {colors: true, depth: null}));

				if (data.error) {
					callback(data.error.info);
					return;
				}

				if (data.query && data.query.pages) {
					for (var pageid in data.query.pages) {
						var page = data.query.pages[pageid];

						request({
							url: root,
							qs: {
								"action": "parse",

								"pageid": page.pageid,

								"prop": "text",
								"section": 0,

								"format": "json"
							}
						}, function(err, res, body) {
							var data = JSON.parse(body);

							if (data.error) {
								callback(data.error.info);
								return;
							}

							var html = data.parse.text["*"];

							var doc = new dom().parseFromString(html);
							var text = xpath.select("./p//text()", doc).map(function(node) {
								return node.nodeValue;
							}).join("").replace(/[\r\n]/g, " ");
							text = self.ellipsize(text, 350);

							callback(null, page.title, text, page.fullurl);
						});
					}
				}
				else
					callback("not found");
			});
		}
	};

	self.query = function(root, method, search, callback) {
		self.methods[method](root, search, function(err, title, text, url) {
			if (!err) {
				bot.plugins.bitly.shorten(url, function(shorturl) {
					callback("\x02" + title + "\x02: " + text + " \x1F" + shorturl);
				});
			}
			else
				callback("\x02" + search + "\x02: " + err);
		});
	};

	self.queryProxy = function(root, method) {
		return function(nick, to, args) {
			var search = args[0].trim();
			if (search.length > 0) {
				self.query(root, method, search, function(str) {
					bot.say(to, str);
				});
			}
		};
	};

	self.events = {
		"cmd#wikipedia": self.queryProxy("https://en.wikipedia.org/w/api.php", "extracts"),
		"cmd#wikipedia2": self.queryProxy("https://en.wikipedia.org/w/api.php", "html"),

		"cmd#wiki": bot.forward("cmd#wikipedia")
	};
}

module.exports = WikiPlugin;

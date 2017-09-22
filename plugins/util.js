function UtilPlugin(bot) {
	var self = this;
	self.name = "util";
	self.help = "Utility functions plugin";
	self.depend = [];

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

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	self.escapeRegExp = function(str) {
		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	};

	self.strUnescape = function(str) {
		try {
			return str.replace(/\\(?:([bfnrtv0])|u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2})|([^bfnrtv0ux]))/g, function(m, s, u, x, o) {
				if (s) {
					return eval("'\\" + s + "'");
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
			bot.out.error("util", e, str);
		}
	};


	// http://www.mredkj.com/javascript/numberFormat.html#addcommas
	self.thSeps = function(nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	self.stripColors = function(text) {
		return text.replace(/\x1f|\x02|\x12|\x0f|\x16|\x03(?:\d{1,2}(?:,\d{1,2})?)?/g, "");
	};

	self.filterRegexFlags = function(flags) {
		return flags.replace(/[^gimuy]/g, "");
	};

	// https://stackoverflow.com/questions/9907419/javascript-object-get-key-by-value
	self.getKeyByValue = function(obj, value) {
		for (var prop in obj) {
			if(obj.hasOwnProperty(prop)) {
				 if(obj[prop] === value)
					 return prop;
			}
		}
		return null;
	};

	self.formatSize = function(size) {
		var units = ["B", "kB", "MiB", "GiB", "TiB"];
		var i = Math.floor(Math.log(size) / Math.log(1024));
		return Math.round(size / Math.pow(1024, i) * 100) / 100 + " " + units[i];
	};

	self.events = {

	};
}

module.exports = UtilPlugin;

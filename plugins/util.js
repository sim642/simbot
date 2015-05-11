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

	self.events = {

	};
}

module.exports = UtilPlugin;

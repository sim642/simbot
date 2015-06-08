function BitsPlugin(bot) {
	var self = this;
	self.name = "bits";
	self.help = "Bits formatting plugin";
	self.depend = [];

	self.formatPair = function(key, value, data) {
		var str = "";
		if (key)
			str += key + ": ";

		var wrap = ["", "\x02", "\x1F"][data !== undefined ? data : 1];
		str += wrap + value + wrap;
		return str;
	};

	self.format = function(prefix, bits, delim) {
		delim = delim || ",";
		var str = "\x02" + prefix + ": \x02";
		for (var i = 0; i < bits.length; i++) {
			str += self.formatPair(bits[i][0], bits[i][1], bits[i][2]);
			if (i != bits.length - 1)
				str += delim + " ";
		}
		return str;
	};
}

module.exports = BitsPlugin;

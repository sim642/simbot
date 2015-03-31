function BarcodePlugin(bot) {
	var self = this;
	self.name = "barcode";
	self.help = "Barcode plugin";
	self.depend = ["cmd"];

	self.chars = " ▗▝▐▖▄▞▟▘▚▀▜▌▙▛█";
	
	self.halflines = " ▐▌█";
	self.quiet = [0,0,0,0,0,0,0,0,0];
	self.start = [1,0,1];
	self.first = [
		[0,0,0,0,0,0], // 0
		[0,0,1,0,1,1], // 1
		[0,0,1,1,0,1], // 2
		[0,0,1,1,1,0], // 3
		[0,1,0,0,1,1], // 4
		[0,1,1,0,0,1], // 5
		[0,1,1,1,0,0], // 6
		[0,1,0,1,0,1], // 7
		[0,1,0,1,1,0], // 8
		[0,1,1,0,1,0]  // 9
	];
	self.leftL = [
		[0,0,0,1,1,0,1], // 0
		[0,0,1,1,0,0,1], // 1
		[0,0,1,0,0,1,1], // 2
		[0,1,1,1,1,0,1], // 3
		[0,1,0,0,0,1,1], // 4
		[0,1,1,0,0,0,1], // 5
		[0,1,0,1,1,1,1], // 6
		[0,1,1,1,0,1,1], // 7
		[0,1,1,0,1,1,1], // 8
		[0,0,0,1,0,1,1]  // 9
	];
	self.leftG = [
		[0,1,0,0,1,1,1], // 0
		[0,1,1,0,0,1,1], // 1
		[0,0,1,1,0,1,1], // 2
		[0,1,0,0,0,0,1], // 3
		[0,0,1,1,1,0,1], // 4
		[0,1,1,1,0,0,1], // 5
		[0,0,0,0,1,0,1], // 6
		[0,0,1,0,0,0,1], // 7
		[0,0,0,1,0,0,1], // 8
		[0,0,1,0,1,1,1]  // 9
	];
	self.middle = [0,1,0,1,0];
	self.right = [
		[1,1,1,0,0,1,0], // 1
		[1,1,0,0,1,1,0], // 0
		[1,1,0,1,1,0,0], // 2
		[1,0,0,0,0,1,0], // 3
		[1,0,1,1,1,0,0], // 4
		[1,0,0,1,1,1,0], // 5
		[1,0,1,0,0,0,0], // 6
		[1,0,0,0,1,0,0], // 7
		[1,0,0,1,0,0,0], // 8
		[1,1,1,0,1,0,0]  // 9
	];
	self.end = [1,0,1];
	self.code0 = "0".charCodeAt(0);

	self.mask = function(br, tr, bl, tl) {
		return self.chars.charAt(br | (tr << 1) | (bl << 2) | (tl << 3));
	};

	self.barmask = function(arr) {
		var str = "";
		for (var i = 0; i < arr.length; i += 2) {
			str += self.halflines[(arr[i] << 1) | (arr[i + 1] || 0)];
		}
		return str;
	};

	self.EAN13 = function(num) {
		var arr = [];

		arr = arr.concat(self.quiet);
		arr = arr.concat(self.start);
		var groups = self.first[num.charCodeAt(0) - self.code0];
		for (var i = 1; i < 7; i++) {
			arr = arr.concat((groups[i - 1] ? self.leftG : self.leftL)[num.charCodeAt(i) - self.code0]);
		}
		arr = arr.concat(self.middle);
		for (var i = 7; i < 13; i++) {
			arr = arr.concat(self.right[num.charCodeAt(i) - self.code0]);
		}
		arr = arr.concat(self.end);
		arr = arr.concat(self.quiet);

		return arr;
	};

	self.UPCA = function(num) {
		return self.EAN13("0" + num);
	};

	self.events = {
		"cmd#bmask": function(nick, to, args) {
			bot.say(to, nick + ": " + self.mask(args[1] & 1, args[2] & 1, args[3] & 1, args[4] & 1));
		},

		"cmd#b-upc": function(nick, to, args) {
			bot.say(to, "\x0301,00" + self.barmask(self.UPCA(args[1])));
		},

		"cmd#b-ean": function(nick, to, args) {
			bot.say(to, "\x0301,00" + self.barmask(self.EAN13(args[1])));
		}
	};
}

module.exports = BarcodePlugin;

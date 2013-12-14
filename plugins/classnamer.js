function ClassNamerPlugin(bot) {
	var self = this;
	self.name = "classnamer";
	self.help = "Classnamer plugin";
	self.depend = ["cmd"];

	self.parts = ["Threadsafe Optimized Stable Automatic Abstract Serializable Writable \
Readable Executable Nonblocking Scriptable Smart Basic Checked \
ErrorCorrecting Simple Secure Cryptographic Flexible Configurable \
Internal Cloneable Legacy Recursive Multiple Threaded Virtual Singleton \
Stateless Stateful Localized Prioritized Generic Dynamic Shared Runnable \
Modal",
"Byte Task Object Resource Mutex Memory List Node File Lock Pixel \
Character Command Client Server Socket Thread Notification Keystroke \
Timestamp Raster String Hash Integer Cache Scrollbar Grid Jar Connection \
Database Graph Row Column Record Metadata Transaction Message Request \
Response Query Statement Result Upload Download User Directory Button \
Device Search Lolcat Girlfriend Robot",
"Sorter Allocator Tokenizer Writer Reader Randomizer Initializer Factory \
FactoryFactory Panel Frame Container Compressor Expander Counter \
Collector Collection Wrapper Accumulator Table Marshaller Demarshaller \
Extractor Parser Scanner Interpreter Validator Window Dialog Stream \
Listener Event Exception Vector Lexer Analyzer Iterator Set Tree \
Concatenator Monitor Tester Buffer Selector Visitor Adapter Helper \
Annotation Permission Info Action Channel Filter Manager Mediator \
Operation Context Queue Stack View Engine Publisher Subscriber Delegator \
State Processor Handler Generator Dispatcher Bundle Builder Logger \
Iterator Observer Encoder Decoder Importer Exporter Util Policy \
Preference Formatter Sequence Comparator Definition Timer Servlet \
Controller Loader Converter Constraint Module Migrator Descriptor \
Process"];

	self.events = {
		"cmd#classname": function(nick, to, args, message) {
			var name = "";
			for (var i = 0; i < self.parts.length; i++) {
				var a = self.parts[i].split(" ");
				name += a[Math.floor(Math.random() * a.length)];
			}
			bot.say(to, nick + ": " + name);
		}
	}
}

module.exports = ClassNamerPlugin;

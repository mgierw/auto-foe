var _ = require('lodash');

var eraList = {
	'StoneAge': 'Stone Age',
	'BronzeAge': 'Bronze Age',
	'IronAge': 'Iron Age',
	'EarlyMiddleAge': 'Early Middle Age',
	'HighMiddleAge': 'High Middle Age',
	'LateMiddleAge': 'Late Middle Age',
	'ColonialAge': 'Colonial Age',
	'IndustrialAge': 'Industrial Age',
	'ProgressiveEra': 'Progressive Era',
	'ModernEra': 'Modern Era',
	'PostModernEra': 'Postmodern Era',
	'ContemporaryEra': 'Contemporary Era',
	'TomorrowEra': 'Tomorrow',
	'FutureEra': 'FUT|The Future',
	'ArcticFuture': 'Arctic Future',
	'OceanicFuture': 'Oceanic Future'
};

var eraListPl = {
	'StoneAge' : 'Epoka Kamienia',
	'BronzeAge' : 'Epoka Brązu',
	'IronAge' : 'Epoka Żelaza',
	'EarlyMiddleAge' : 'Wczesne Średniowiecze',
	'HighMiddleAge' : 'Rozkwit Średniowiecza',
	'LateMiddleAge' : 'Jesień Średniowiecza',
	'ColonialAge' : 'Epoka Kolonialna',
	'IndustrialAge' : 'Epoka Przemysłowa',
	'ProgressiveEra' : 'Epoka Postępowa',
	'ModernEra' : 'Modernizm',
	'PostModernEra' : 'Postmodernizm',
	'ContemporaryEra' : 'Współczesność',
	'TomorrowEra' : 'Epoka Jutra',
	'FutureEra' : 'FUT|Przyszłość',
	'ArcticFuture' : 'Arktyczna Przyszłość',
	'OceanicFuture': 'Oceaniczna Przyszłość'
};



module.exports = {
	getEraName: eraSymbol => eraListPl[eraSymbol],
	getEraIndex: eraSymbol => _(eraList).keys().findIndex(v => v === eraSymbol)
};

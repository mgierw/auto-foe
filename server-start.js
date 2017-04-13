var moment = require('moment');
require('moment-timezone');
require('console-stamp')(console, {
	formatter: () => moment().tz('Europe/Warsaw').format('YYYY-MM-DD HH:mm:ss.SSS')
});
var path = require('path');
var express = require('express');
var app = express();
var index = require('./index');
var fs = require('fs');
var _ = require('lodash');
var compression = require('compression');

var isLocal = (process.env.OPENSHIFT_NODEJS_IP === undefined);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
console.log(`Będę uruchamiał serwer na porcie ${server_port}, na adresie ${server_ip_address}`);

app.use(compression({
	filter: function(req, res) {
		if (req.headers['x-no-compression']) {
			return false;
		}
		return compression.filter(req, res);
	}
}));
app.use('/', express.static('http'));
app.use('/asset', express.static('static/asset'));

app.listen(server_port, server_ip_address, function () {
	console.log(`Nasłuch na porcie ${server_port}, na adresie ${server_ip_address}`);
});
app.get('/health', (req, res) => {
	res.end();
});
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, './http/index.html'));
});

var userSettings = JSON.parse(fs.readFileSync('./userdata/settings.json', 'utf8'));
//var userData = userSettings.accounts[0];
//var gameHelper = index.get(userData);
_.each(userSettings.accounts, a => {
	a.gameHelper = index.get(a);
	a.gameHelper.startAccount();
});

app.get('/ctrl/getAccountList', (req, res) => {
	res.json(_.map(userSettings.accounts, a => {
		return {
			username: a.username,
			world: a.world,
			worldName: a.worldName,
			eraName: a.eraName
		};
	}));
});

app.get('/ctrl/*', (req, res) => {
	var methodName = req.params[0];
	if (methodName) {
		console.log(`${req.query.username}(${req.query.world}): wywołano metodę ${methodName}`);
		var foundAccount = _.find(userSettings.accounts, a => a.username === req.query.username && a.world === req.query.world);
		if (foundAccount) {
			var method = foundAccount.gameHelper[methodName];
			method(req.query).then(result => {
				res.json(result);
			});
		}
	}
});

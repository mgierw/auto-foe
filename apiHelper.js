'use strict';

var ns = require('./network-service');
var util = require('./util');
var _ = require('lodash');
var googleHelper = require('./google-helper');
var loginHelper = require('./login-helper');
var uuid = require('node-uuid');

var createService = function(userData) {
	var networkService = ns.get(userData.username + '_' + userData.world);
	var requestId = 0;
	var gatewayUrl;
	var basePath;
	var wls = util.writeLogService(userData);
	const randomGuid = uuid.v4();
	wls.writeLog(`Uruchamiam ApiHelper, UUID = ${randomGuid}`);

	var createObject = function(className) {
		//wls.writeLog('Wywołanie createObject');
		return {
			__class__: className
		};
	};

	var createServerRequest = function(requestClass, requestData, requestMethod) {
		//wls.writeLog('Wywołanie createServerRequest');
		var o = createObject('ServerRequest');
		o.clientIdentification = null;
		o.requestClass = requestClass;
		o.requestData = requestData;
		o.requestId = requestId++;
		o.requestMethod = requestMethod;
		return o;
	};

	var doStartGame = function(url, data) {
		var prom;
		if (url) {
			prom = networkService.doGet(url);
		} else {
			prom = util.getEmptyPromise(data);
		}
		wls.writeLog(`doStartGame('${url}')`);
		var reqUri;
		var currentWorld;
		return prom.then(data => {
			reqUri = data.response.request.uri;
			var fetchWorldsUri = reqUri.protocol + '//' + reqUri.host + '/start/index?action=fetch_worlds_for_login_page';
			//wls.writeLog(fetchWorldsUri);
			return networkService.doPostAjax(fetchWorldsUri, {
				json: null
			});
		}).then((data) => {
			var playerWorld = _.filter(data.ajax.worlds, w => _.find(data.ajax.player_worlds, (pw, k) => w.id === k) !== undefined);
			//wls.writeLog(`Dostępne światy gracza`);
			//_.each(playerWorld, w => {
			//	wls.writeLog(`\t${w.name}`);
			//});
			currentWorld = _.find(playerWorld, pw => pw.id === userData.world);
			//wls.writeLog(userData.world);
			//wls.writeLog(playerWorld);
			return networkService.doPostAjax(reqUri.protocol + '//' + reqUri.host + '/start/index?action=play_now_login', {
				json: JSON.stringify({
					world_id: userData.world
				})
			});
		}).then(data => {
			return networkService.doGet(data.ajax.login_url);
		}).then(data => {
			var gwTmp = util.extractFlashVar(data.$, 'string_gatewayUrl');
			if (!gwTmp) {
				throw Error('Nie znalazłem gatewayUrl');
			}
			gatewayUrl = gwTmp;
			basePath = util.extractFlashVar(data.$, 'string_basepath');
			//wls.writeLog(`UUID = ${randomGuid}`);
			return {
				status: 'ACCOUNT_STARTED',
				world: currentWorld
			};
		}).catch(err => {
			util.handleError(err, 'Wystąpił błąd w sekwencji doStartGame');
		});
	};

	var doApiRequestArray = function(reqDataArray) {
		//wls.writeLog('Wywołanie doApiRequest');
		//wls.writeLog(`UUID = ${randomGuid}`);
		return networkService.doApiRequest(gatewayUrl, reqDataArray);
	};

	var doApiRequest = function(reqData) {
		return doApiRequestArray([reqData]);
	};

	var handleAccountSelect = function(data) {
		var $ = data.$;
		var chooseAccountList = $('span.flag');
		if (chooseAccountList.length !== 0) {
			wls.writeLog('There is a choose account list');
			var selectedSpan = $(chooseAccountList[0]);
			if (chooseAccountList.length > 1) {
				var defSpan = $('span.flag.' + userData.lang);
				if (defSpan.length === 1) {
					selectedSpan = defSpan;
					wls.writeLog('Found default account for lang = ' + userData.lang + ': ' + defSpan.parent().text());
				}
			}
			wls.writeLog('Selecting account: ' + selectedSpan.parent().text());
			//var selectUrl = defSpan.parent().attr('onclick').split('\'')[1];
			var reqUri = data.response.request.uri;
			var selectUrl = reqUri.protocol + '//' + reqUri.host + selectedSpan.parent().attr('onclick').split('\'')[1];
			return doStartGame(selectUrl);
		}
		return doStartGame(null, data);
	};

	var startAccount = function() {
		if (userData.logged) {
			wls.writeLog('Gra już jest uruchomiona');
			return util.getEmptyPromise({
				status: 'ALREADY_STARTED'
			});
		}
		var prom;
		if (userData.loginType === 'google') {
			prom = googleHelper.login(networkService, userData);
		} else {
			prom = loginHelper.login(networkService, userData);
		}
		return prom.then(data => {
			userData.logged = true;
			return handleAccountSelect(data);
		});
	};

	var getBasePath = function() {
		//wls.writeLog(`Pobieram basePath = ${basePath}`);
		return basePath;
	};

	return {
		createObject: createObject,
		createServerRequest: createServerRequest,
		doStartGame: doStartGame,
		doApiRequestArray: doApiRequestArray,
		doApiRequest: doApiRequest,
		startAccount: startAccount,
		getBasePath: getBasePath,
		networkService: networkService
	};
};

exports.get = createService;

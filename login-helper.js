var util = require('./util');
var _ = require('lodash');

var login = function(networkService, userData) {
	if (userData.logged) {
		console.log('This account is already running');
		return util.getEmptyPromise({
			status: 'ALREADY_STARTED'
		});
	}
	var getUrl = function(form, res) {
		var reqUri = res.request.uri;
		var action = form.attr('action');
		if (action.substr(0, 4) === 'http') {
			console.log('Form action blocked by a full URL');
			return action;
		}
		console.log('The form action is not a full URL, applying the protocol and the host');
		return reqUri.protocol + '//' + reqUri.host + action;
	};
	var collectForm = function($, form) {
		var formElements = form.find('input[type!=submit][type!=button]');
		var formData = _(formElements).map((input) => $(input)).filter((input) => {
			return input.attr('name');
		}).map((input) => {
			return [input.attr('name'), input.val()];
		}).fromPairs().value();
		return formData;
	};
	/*
	var submitForm = function(data, formSelector, msg, valuesToFill) {
		console.log("submitForm: " + msg);
		var form = data.$(formSelector);
		var formData = collectForm(data.$, form);
		_.assign(formData, valuesToFill);
		return networkService.doPost(getUrl(form, data.response), formData);
	};
	*/
	var submitForm2 = function(data, formSelector, msg, valuesToFill) {
		console.log('submitForm: ' + msg);
		var form = data.$(formSelector);
		var formData = collectForm(data.$, form);
		_.assign(formData, valuesToFill);
		return networkService.doPostAjax(getUrl(form, data.response), formData, {
			headers: {
				'X-XSRF-TOKEN': _.find(data.response.headers['set-cookie'], c => c.startsWith('XSRF')).split(';')[0].split('=')[1]
			}
		});
	};
	//doPostAjax
	console.log('Logowanie za pomocą konta gry');
	return networkService.doGet('https://us.forgeofempires.com/', {}).then(data => {
		var formSelector = 'form[name=login]';
		if (!data.$(formSelector).length) {
			return util.getEmptyPromise(data);
		}
		return submitForm2(data, formSelector, 'Sending login information…', {
			'login[userid]': userData.username,
			'login[password]': new Buffer(userData.password, 'base64').toString('ascii'),
			'login[remember_me]': 'true'
		}).then(data => {
			//var url = data.$('meta[property="og:url"]').attr("content");
			var respJson = JSON.parse(data.body);
			var uri = data.response.request.uri;
			var url = uri.protocol + '//' + uri.host + respJson.url;
			console.log(`Wynik: ${respJson.success}, url: ${respJson.url}, id gracza: ${respJson.player_id}`);
			console.log(`url = ${url}`);
			return networkService.doGet(url);
		});
	}).then(data => {
		console.log(data.$('title').text());
		userData.logged = true;
		return data;
	}).catch(util.handleError);
};

exports.login = login;

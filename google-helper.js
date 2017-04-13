var util = require('./util');
var _ = require('lodash');

var login = function(networkService, userData) {
	if (userData.logged) {
		console.log('The account is already running');
		return util.getEmptyPromise({
			status: 'ALREADY_STARTED'
		});
	}
	var getUrl = function(form, res) {
		var reqUri = res.request.uri;
		var action = form.attr('action');
		if (action.substr(0, 4) === 'http') {
			console.log('Form action is full for URL ' + reqUri);
			return action;
		}
		var url = reqUri.protocol + '//' + reqUri.host + action;
		console.log('The form action is not full for URL, I paste the protocol and the host' + url);
		return url;
	};
	var collectForm = function($, form) {
		//console.log(form.attr('action'));
		//console.log(form.attr('method'));
		var formElements = form.find('input[type!=submit][type!=button]');
		var formData = _(formElements).map((input) => $(input)).filter((input) => {
			return input.attr('name');
		}).map((input) => {
			return [input.attr('name'), input.val()];
		}).fromPairs().value();
		return formData;
	};
	var submitForm = function(data, formSelector, msg, valuesToFill) {
		console.log('submitForm: ' + msg);
		var form = data.$(formSelector);
		var formData = collectForm(data.$, form);
		_.assign(formData, valuesToFill);
		return networkService.doPost(getUrl(form, data.response), formData);
	};
	console.log('Logowanie za pomocą konta Google');
	return networkService.doGet('https://ipp-google.innogames.de/?game=foe&market=' + userData.lang).then(data => {
		var gaiaLoginFormSelector = 'form[id=gaia_loginform]';
		var form = data.$(gaiaLoginFormSelector);
		if (form.length !== 0) {
			return submitForm(data, gaiaLoginFormSelector, 'Using a username from Google…', {
				Email: userData.username
			}).then(data => {
				return submitForm(data, gaiaLoginFormSelector, 'Entering password for Google…', {
					Passwd: new Buffer(userData.password, 'base64').toString('ascii')
				});
			}).then(data => {
				var challengeFormSelector = 'form[data-challengeentry="2"]';
				if (data.$(challengeFormSelector).length) {
					return submitForm(data, challengeFormSelector, 'Select the login verification by answer to the control question…').then(data => {
						return submitForm(data, 'form[id=challenge]', 'Control question answered…', {
							answer: userData.answer
						}).then(data => {
							console.log('I responded to a control question and logged in to my Google Account');
							return data;
						});
					});
				}
				console.log('Logged into Google');
				return data;
			});
		}
		console.log('Already logged into Google');
		return data;
	}).then(data => {
		console.log(data.$('title').text());
		//return handleAccountSelect(data.$, data.response);
		userData.logged = true;
		return data;
	}).catch(util.handleError);
};

exports.login = login;

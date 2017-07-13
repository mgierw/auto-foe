var request = require('request');
var cheerio = require('cheerio');
var _ = require('lodash');
var FileCookieStore = require('tough-cookie-file-store');
var fs = require('fs');
//var uuid = require('node-uuid');
var md5 = require('./md5');
var url = require('url');
var querystring = require('querystring');

var createService = function(cookieFileName) {
	var userdataFolderPath = 'userdata';
	if (!fs.existsSync(userdataFolderPath)) {
		fs.mkdirSync(userdataFolderPath);
	}
	var logFolderPath = 'log';
	if (!fs.existsSync(logFolderPath)) {
		fs.mkdirSync(logFolderPath);
	}

	var cookieJarPath = userdataFolderPath + '/' + cookieFileName + '.json';
	if (!fs.existsSync(cookieJarPath)) {
		fs.closeSync(fs.openSync(cookieJarPath, 'w'));
	}

	console.log(`Korzystam z cookie jar: ${cookieJarPath}`);
	var cookieJar = request.jar(new FileCookieStore(cookieJarPath));

	var baseRequestOptions = {
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36',
		//jar: cookieJar,
		followAllRedirects: true
	};

	request = request.defaults(baseRequestOptions);

	request.debug = true;

	var doRequest = function(method, options, createResolveObjectCallback) {
		var localOptions = _.assign({}, options);
		localOptions.jar = cookieJar;
		return new Promise(function(resolve, reject) {
			//console.log(localOptions);
			method.call(request, localOptions, function(error, response, body) {
				if (error) {
					console.log('Wystąpiły błędy');
					console.log(error);
					reject(error);
				} else {
					//console.log(response);
					//var guid = uuid.v4();
					//saveBodyToFile(guid + "_body.html", body);
					resolve(createResolveObjectCallback(response, body));
				}
			});
		}).catch(error => {
			console.log('Wystąpił błąd');
			console.log(error);
			throw error;
		});
	};

	var doJQueryRequest = function(method, options) {
		console.log('doJQueryRequest: ' + options.url);
		return doRequest(method, options, (response, body) => {
			return {
				$: cheerio.load(body),
				response: response,
				body: body
			};
		});
	};

	var doAjaxRequest = function(method, options) {
		//console.log('Wywołanie doAjaxRequest');
		options.gzip = true;
		if (!options.headers) {
			options.headers = {};
		}
		_.assign(options.headers, {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'X-Requested-With': 'XMLHttpRequest'
		});
		return doRequest(method, options, (response, body) => {
			if (body) {
				//console.log('Jest body');
				var bodyParties = body.split('\n');
				if (bodyParties && bodyParties.length && bodyParties.length >= 1 && bodyParties[0] && bodyParties[1]) {
					//console.log('Udało się podzielić');
					var ajaxLength = parseInt(bodyParties[0]);
					var ajax = bodyParties[1].substr(0, ajaxLength);
					return {
						ajax: JSON.parse(ajax),
						response: response,
						body: body
					};
				}
			}
			return {
				ajax: null,
				response: response,
				body: body
			};
		});
	};

	var doJsonRequest = function(method, options) {
		options.headers['Content-Type'] = 'application/json';
		options.gzip = true;
		options.json = true;
		return doRequest(method, options, (response, body) => {
			return {
				json: body,
				response: response,
				body: body
			};
		});
	};

	var doGet = function(url) {
		return doJQueryRequest(request.get, {
			url: url
		});
	};

	var doPost = function(url, form) {
		return doJQueryRequest(request.post, {
			form: form,
			url: url
		});
	};

	var doPostAjax = function(url, form, options) {
		return doAjaxRequest(request.post, _.assign({
			form: form,
			url: url
		}, options || {}));
	};

	var doPostJson = function(url, form, options) {
		//console.log(`doPostJson("${url}", "${form}")`);
		return doJsonRequest(request.post, _.assign({
			body: form,
			url: url
		}, options || {}));
	};

	var doGetJson = function(url, form, options) {
		//console.log(`doPostJson("${url}", "${form}")`);
		return doJsonRequest(request.get, _.assign({
			body: form,
			url: url
		}, options || {headers: {}}));
	};

	var saveToFile = function(/*fileName, objToSave*/) {
		/*
		if (!process.env.NODE_PORT) {
			fs.open(logFolderPath + '/' + fileName, 'w', (err, fd) => {
				if (err) {
					console.log(err);
				} else {
					fs.write(fd, JSON.stringify(objToSave), () => {
						fs.close(fd);
					});
				}
			});
		}
		*/
	};
	/*
	var saveBodyToFile = function(fileName, body) {
		fs.open(logFolderPath + '/' + fileName, 'w', (err, fd) => {
			if (err) {
				console.log(err);
			} else {
				fs.write(fd, body, () => {
					fs.close(fd);
				});
			}
		});
	};
	*/
	var reqCounter = 0;

	var doApiRequest = function(gatewayUrl, reqData) {
		if (!gatewayUrl) {
			const msg = 'Parametr gatewayUrl jest null-em';
			console.log(msg);
			throw new Error(msg);
		}
		var gwUrlObj = url.parse(gatewayUrl);
		var q = querystring.parse(gwUrlObj.query);
		var stringifiedReqData = JSON.stringify(reqData);
		//console.log(stringifiedReqData);
		//var guid = uuid.v4();
		reqCounter++;
		saveToFile(q.h + '_' + reqCounter + '_request.json', reqData);
		return doPostJson(gatewayUrl, reqData, {
			headers: {
				'X-Requested-With': 'ShockwaveFlash/22.0.0.209',
				'Connection': 'keep-alive',
				'Origin': 'https://foepl.innogamescdn.com',
				'Client-Identification': 'version=1.82; requiredVersion=1.82; platform=bro; platformVersion=web',
				'Referer': 'https://foepl.innogamescdn.com/swf/Preloader.swf?1471254046/[[DYNAMIC]]/1',
				'Signature': md5.hash(q.h + 'forgeofempires' + stringifiedReqData).substr(0, 10)
			},
		}).then((data) => {
			//console.log('Otrzymano odpowiedź');
			saveToFile(q.h + '_' + reqCounter + '_response.json', data.json);
			var foundError = _.find(data.json, (sr) => {
				return sr.__class__ === 'Error';
			});
			if (foundError) {
				console.log('Serwer zwrócił błąd: ' + foundError.title);
				console.log('\t' + foundError.message);
				console.log(JSON.stringify(reqData));
			}
			// var foundRedirect = _.find(data.json, (sr) => {
			// 	return sr.__class__ === "Redirect";
			// });
			// if (foundRedirect) {
			// 	console.log("Serwer zwrócił Redirect");
			// 	console.log("\t" + foundRedirect.message);
			// 	console.log("\t" + foundRedirect.url);
			// }
			return data;
		}).catch(err => {
			console.log('Wystąpił błąd');
			console.log(err);
			throw err;
		});
	};

	return {
		doGet: doGet,
		doPost: doPost,
		doPostAjax: doPostAjax,
		doPostJson: doPostJson,
		doApiRequest: doApiRequest,
		doGetJson: doGetJson
	};
};

exports.get = createService;

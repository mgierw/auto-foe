var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, resourceService) => {
	const serviceName = 'ResearchService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	let researchArray = null;

	var retrieveResearchArray = () => apiService.doServerRequest(serviceName, [], 'start');

	var processPayTechnology = function() {
		var foundTech = _.find(researchArray, r => {
			if (r.id !== 'root') {
				var currentSP = _.get(r, 'progress.currentSP', 0);
				var maxSP = _.get(r, 'maxSP', 0);
				var isPaid = _.get(r, 'progress.is_paid', false);
				if (!isPaid && currentSP === maxSP) {
					//writeLog(`Technologia ${r.name} jest nieopłacona i są wypełnione punkty rozwoju`);
					var areReqMet = _.every(_.get(r, 'requirements.resources'), (v, k) => {
						if (k !== 'premium') {
							var availableAmount = resourceService.getAmount(k);
							//writeLog(`Potrzeba ${v} ${k}, a mamy ${availableAmount}`);
							if (availableAmount >= v) {
								//writeLog(`Jest potencjał do opłacenia technologii ${r.name}: ${v} ${k}, mam ${availableAmount}`);
								return true;
							}
						}
					});
					if (areReqMet) {
						return true;
					}
				}
			}
			return false;
		});
		if (foundTech) {
			wls.writeLog(`Opłacam technologię ${foundTech.name}`);
			return apiService.doServerRequest(serviceName, [foundTech.id], 'payTechnology').then(resourceService.getResources);
		}
		return util.getEmptyPromise(null);
	};

	var spendStrategicPoints = function() {
		if (resourceService.isPossibleToSpendSp()) {
			//writeLog(`Wydawanie punktów rozwoju, obecnie mam ${sp} punktów`);
			var foundTech = _.find(researchArray, r => {
				var currentSP = _.get(r, 'progress.currentSP', 0);
				var maxSP = _.get(r, 'maxSP', 0);
				var isPaid = _.get(r, 'progress.is_paid', false);
				//writeLog(`Technologia: ${r.name}, currentSP = ${currentSP}, maxSP = ${maxSP}, isPaid = ${isPaid}`);
				if (!isPaid && currentSP < maxSP) {
					return _.every(r.parentTechnologies, ct => {
						var foundTech = _.find(researchArray, r2 => r2.id === ct);
						return foundTech && _.get(foundTech, 'progress.is_paid', false);
					});
				}
				return false;
			});
			var amountToSpend = 1;
			if (foundTech) {
				wls.writeLog(`Wydawanie ${amountToSpend} punktu(ów) na technologię ${foundTech.name}`);
				resourceService.decreaseSp(amountToSpend);
				return apiService.doServerRequest(serviceName, [foundTech.id, amountToSpend], 'useStrategyPoints');
			}
		}
		//return spendSpForGb(cityMapService.getBuildingList());
		return Promise.resolve(null);
	};

	return {
		handleResponse: (rd) => {
			var handleStart = function(responseData) {
				researchArray = responseData;
			};
			var handleUseStrategyPoints = function(rd) {
				if (rd.technology) {
					util.replaceInArray(researchArray, 'id', rd.technology);
				}
				//if (rd.strategyPoints) {
				//	resourceService.setSp(rd.strategyPoints);
				//}
			};
			var handlePayTechnology = function(rd) {
				if (rd.technology) {
					util.replaceInArray(researchArray, 'id', rd.technology);
				}
				//if (rd.strategyPoints) {
				//	resourceService.setSp(rd.strategyPoints);
				//}
			};
			switch (rd.requestMethod) {
			case 'start':
				handleStart(rd.responseData);
				break;
			case 'useStrategyPoints':
				handleUseStrategyPoints(rd.responseData);
				break;
			case 'payTechnology':
				handlePayTechnology(rd.responseData);
				break;
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			return (researchArray ? Promise.resolve(null) : retrieveResearchArray())
				.then(spendStrategicPoints)
				.then(processPayTechnology);
		},
		getResearchArray: () => researchArray,
		findTechById: id => _.find(researchArray, r => r.id === id),
		isTechPaidById: id => {
			const foundtech = _.find(researchArray, r => r.id === id);
			return foundtech && foundtech.progress && foundtech.progress.is_paid;
		}
	};
};

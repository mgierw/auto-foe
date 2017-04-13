var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, otherPlayerService, resourceService, researchService) => {
	const serviceName = 'FriendsTavernService';
	const wls = util.writeLogService(userData);

	let tavernData = null;
	let tavernStates = null;

	const invokeMethod = (methodName, params) => apiService.doServerRequest(serviceName, params, methodName);
	const getOwnTavern = () => invokeMethod('getOwnTavern', []);
	const collectReward = () => invokeMethod('collectReward', []);
	//const getOtherTavernState = (playerId) => invokeMethod('getOtherTavernState', [playerId]);
	//const getOtherTavern = (playerId) => invokeMethod('getOtherTavern', [playerId]);
	//const getConfig = () => invokeMethod('getConfig', []);
	const getOtherTavernStates = () => invokeMethod('getOtherTavernStates', []);

	const refreshGuard = util.intervalPromiseGuard2(300, getOwnTavern);
	const otherTawernRefreshGuard = util.intervalPromiseGuard2(300, () => {
		const sysdate = (new Date()).valueOf();
		//wls.writeLog('Wywołuję metodę getOtherTavern dla wszystkich "znajomych"...');
		const playersToVisit = _(tavernStates)
			.filter(ts => ts.state !== 'alreadyVisited' || ts.nextVisitTime * 1000 < sysdate)
			.filter(ts => ts.state !== 'noChair' && ts.state !== 'isSitting')
			.filter(ts => ts.sittingPlayerCount && ts.unlockedChairCount > ts.sittingPlayerCount)
			.map(ts => apiService.apiHelper.createServerRequest(serviceName, [ts.ownerId], 'getOtherTavern'))
			.value();
		return apiService.doApiRequestArray(playersToVisit).then(getOtherTavernStates);
	});

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getOwnTavern') {
				tavernData = rd.responseData;
			} else if (rd.requestMethod === 'collectReward') {
				wls.writeLog(`Wynik zebrania srebra z tawerny: ${rd.responseData.__class__}`);
			} else if (rd.requestMethod === 'getOtherTavernStates') {
				//wls.writeLog('Otrzymano odpowiedź z komunikatu getOtherTavernStates');
				tavernStates = rd.responseData;
			} else if (rd.requestMethod === 'getOtherTavernState') {
				wls.writeLog('Otrzymano odpowiedź z komunikatu getOtherTavernState');
				util.replaceInArray(tavernStates, 'ownerId', rd.responseData);
			} else if (rd.requestMethod === 'getOtherTavern') {
				wls.writeLog(`Wynik odwiedzenia tawerny: ${rd.responseData.state}`);
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			if (researchService.isTechPaidById('construction')) {
				if (!tavernData) {
					return getOwnTavern();
				}
				if (_.size(tavernData.view.visitors) === tavernData.view.unlockedChairs) {
					wls.writeLog(`W tawernie jest komplet gości: ${tavernData.view.unlockedChairs}, zbieram srebro`);
					return collectReward().then(getOwnTavern);
				}
				return refreshGuard.invoke()
					.then(otherTawernRefreshGuard.invoke);
			}
			return Promise.resolve(null);
		},
		getData: () => ({
			tavernStates,
			tavernData,
			silverAmount: resourceService.getTavernSilverAmount()
		})
	};
};

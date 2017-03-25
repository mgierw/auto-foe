var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService) => {
	const serviceName = 'TreasureHuntService';
	const wls = util.writeLogService(userData);

	let treasureChests = null;
	let lastRefresh = {};
	let lastTravelingTc = null;

	const getOverview = () => apiService.doServerRequest(serviceName, [], 'getOverview');

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getOverview' || rd.requestMethod === 'getChests') {
				treasureChests = rd.responseData.treasure_chests;
			} else if (rd.requestMethod === 'collectTreasure') {
				wls.writeLog(`Znaleziono skarb ${rd.responseData.name}`);
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			if (!treasureChests) {
				return getOverview();
			}
			const getTcRewardDesc = tc => _(tc.possible_rewards).map(pr => `${pr.reward.name} (${pr.drop_chance} %)`).join(', ');
			const getTcByState = stateClassName => _.find(treasureChests, ts => ts.state.__class__ === stateClassName);
			const sysdate = (new Date()).valueOf();
			const travelingTs = getTcByState('TreasureChestTraveling');
			if (travelingTs) {
				const rewards = getTcRewardDesc(travelingTs);
				if (travelingTs.state.arrival_time * 1000 > sysdate) {
					if (lastTravelingTc !== travelingTs) {
						wls.writeLog(`Trwa podróż po skarb: ${rewards}, koniec: ${new Date(travelingTs.state.arrival_time * 1000)}`);
						lastTravelingTc = travelingTs;
					}
					return Promise.resolve(null);
				} else {
					wls.writeLog(`Ukończono podróż po skarb: ${rewards}`);
				}
			}
			const collectableTc = getTcByState('TreasureChestCollectable');
			const closedTc = getTcByState('TreasureChestClosed');
			if (collectableTc || closedTc || travelingTs) {
				wls.writeLog('Zgarniam skarb i płynę po następny.');
				return apiService.doServerRequest(serviceName, [], 'collectTreasure');
			}
			if (!closedTc) {
				return util.intervalPromiseGuard(lastRefresh, 3600, getOverview);
			}
			return Promise.resolve(null);
		}
	};
};

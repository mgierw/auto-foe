var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService) => {
	const serviceName = 'TreasureHuntService';
	const wls = util.writeLogService(userData);

	let treasureChests = null;
	let lastRefresh = {};
	let lastTravelingTc = null;

	const getOverview = () => apiService.doServerRequest(serviceName, [], 'getOverview');

	wls.writeLog(`Creating service ${serviceName}`);

	return {
		handleResponse: (rd) => {
			if (rd.requestMethod === 'getOverview' || rd.requestMethod === 'getChests') {
				treasureChests = rd.responseData.treasure_chests;
			} else if (rd.requestMethod === 'collectTreasure') {
				wls.writeLog(`Found a treasure ${rd.responseData.name}`);
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
						wls.writeLog(`Treasure journey underway: ${rewards}, ending: ${new Date(travelingTs.state.arrival_time * 1000)}`);
						lastTravelingTc = travelingTs;
					}
					return Promise.resolve(null);
				} else {
					wls.writeLog(`Treasure journey was completed: ${rewards}`);
				}
			}
			const collectableTc = getTcByState('TreasureChestCollectable');
			const closedTc = getTcByState('TreasureChestClosed');
			if (collectableTc || closedTc || travelingTs) {
				wls.writeLog('Taking the treasure and going to the next one.');
				return apiService.doServerRequest(serviceName, [], 'collectTreasure');
			}
			if (!closedTc) {
				return util.intervalPromiseGuard(lastRefresh, 3600, getOverview);
			}
			return Promise.resolve(null);
		}
	};
};

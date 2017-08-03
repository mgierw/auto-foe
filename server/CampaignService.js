var util = require('../util');
var _ = require('lodash');
var dijkstra = require('../dijkstra');

exports.get = (userData, apiService, cityResourcesService, eraService) => {
	const serviceName = 'CampaignService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Tworzę usługę ${serviceName}`);

	let campaign = null;
	let depositStates = {};

	var getCampaign = () => apiService.doServerRequest(serviceName, [], 'start');

	var provinceRevardTypePriorityObj = {
		'goods': 0,
		'expansion': 1,
		'loot': 2,
		'tower': 3
	};

	var handleProductionTimeouts = function() {
		var sysdate = (new Date()).valueOf();
		var scout = _.get(campaign, 'scout', null);
		if (scout) {
			var ttt = _.get(scout, 'time_to_target', 0);
			if (ttt) {
				var nextTick = sysdate + ttt * 1000;
				if (scout.__timeout__ === undefined) {
					scout.__timeout__ = nextTick;
				}
			}
		}
	};

	var getProvinceById = function(pId) {
		return _.find(campaign.provinces, p => p.id === pId);
	};

	var processCampaign = function() {
		if (campaign) {
			var scoutedAndNotPayedProvinces = _.filter(campaign.provinces, p => p.isScouted && !p.isPlayerOwned);
			var toRetrieve = _.find(scoutedAndNotPayedProvinces, p => !p.segmentArray);
			if (toRetrieve) {
				wls.writeLog(`Pobieram szczegóły prowincji ${toRetrieve.name}`);
				return apiService.doServerRequestR('CampaignService', [toRetrieve.id], 'getProvinceData').then(segmentArray => {
					toRetrieve.segmentArray = segmentArray;
				});
			} else {
				// Wszystkie prowincje zostały pobrane
				const provinceToPay = _(scoutedAndNotPayedProvinces).filter(p => {
					var remainingResourcesToPay = _(p.segmentArray).filter(s => !s.isPlayerOwned).map(s => _.map(s.resourcePrice.resources, (v, k) => ({good_id: k, value: v}))).flatten().groupBy('good_id').mapValues(g => _.sumBy(g, 'value')).map((v, k) => ({good_id: k, value: v})).value();
					return _.every(remainingResourcesToPay, gp => cityResourcesService.getAmount(gp.good_id) >= gp.value);
				}).sortBy(p => {
					if (p.reward) {
						return provinceRevardTypePriorityObj[p.reward.type];
					}
					return 10;
				}).first();
				if (provinceToPay) {
					const firstSegmentToBuy = _(provinceToPay.segmentArray).filter(s => !s.isPlayerOwned).first();
					wls.writeLog(`Opłacam segment: id = ${firstSegmentToBuy.id}, prowincja: ${provinceToPay.name}`);
					return apiService.doServerRequestR('CampaignService', [firstSegmentToBuy.provinceId, firstSegmentToBuy.id], 'buySector').then(segmentArray => {
						var province = _.find(campaign.provinces, p => p.id === firstSegmentToBuy.provinceId);
						province.segmentArray = segmentArray;
					}).then(cityResourcesService.getResources).then(getCampaign);
				}
/*
				var isSomeScouted = function(idArray)  {
					return _(idArray).map(pId => {
						var p = getProvinceById(pId);
						return p.isScouted && p.isPlayerOwned;
					}).some();
				};

				var isEveryScouted = function(idArray)  {
					return _(idArray).map(pId => {
						var p = getProvinceById(pId);
						return p.isScouted && p.isPlayerOwned;
					}).every();
				};
*/
				var sysdate = (new Date()).valueOf();
				if (campaign.scout.__timeout__ && campaign.scout.__timeout__ < sysdate) {
					return getCampaign();
				}

				var currentEraIndex = eraService.getEraIndex(userData.era);

				var pairArray = _(campaign.provinces).map(sp => _.map(sp.children, c => {
					var tp = getProvinceById(c.targetId);
					if (!tp) {
						return null;
					}
					var spTime = sp.isPlayerOwned ? 600 : c.travelTime;
					var tpTime = tp.isPlayerOwned ? 600 : c.travelTime;
					return [[sp.id, c.targetId, tpTime], [c.targetId, sp.id, spTime]];
				})).flatten().filter(_.identity).flatten().filter(pair => pair[0] !== undefined && pair[1] !== undefined).filter(pair =>  getProvinceById(pair[0]).isScouted || getProvinceById(pair[1]).isScouted).value();
				var scoutedArray = _(campaign.provinces).filter(p => p.isScouted).value();
				var provinceToScoutArray = _(scoutedArray).map(p => _.filter(pairArray, pa => pa[0] === p.id)).flatten().map(pa => pa[1]).uniq().map(id => getProvinceById(id)).filter(p => !p.isScouted && eraService.getEraIndex(p.era) <= currentEraIndex).filter(p => _(p.blockers).map(bId => getProvinceById(bId)).every(p => p.isPlayerOwned)).value();
				//var provinceToScoutArray = _(campaign.provinces).filter(p => p.id !== 1 && !p.isScouted && getEraIndex(p.era) <= currentEraIndex && isSomeScouted(p.parentIds) && isEveryScouted(p.blockers)).sortBy(p => p.scoutingCost).value();

				if (provinceToScoutArray.length !== 0 && (!campaign.scout.__timeout__ || campaign.scout.__timeout__ < sysdate)) {
					var targetProvince = provinceToScoutArray[0];
					var graphData = _(pairArray).groupBy(p => p[0]).mapValues(v => _(v).map(x => [x[1], x[2]]).fromPairs().value()).value();

					var graph = new dijkstra.Graph(graphData);
					var path = _.map(graph.findShortestPath(campaign.scout.current_province, targetProvince.id), x => parseInt(x));

					var travelTime = _(path).map((id, i, t) => {
						if (i === t.length - 1) {
							return 0;
						}
						var np = getProvinceById(t[i + 1]);
						if (np && np.isPlayerOwned) {
							return 600;
						}
						return graphData[id][t[i + 1]];
					}).sum();

					if (targetProvince.scoutingCost < cityResourcesService.getAmount('money')) {
						wls.writeLog(`Wysyłam zwiadowcę do prowincji ${targetProvince.name}, koszt: ${targetProvince.scoutingCost}, czas podróży: ${travelTime}`);
						wls.writeLog(path);
						return apiService.doServerRequestR('CampaignService', [path, travelTime], 'moveScoutToProvince').then(travelTimeResp => {
							wls.writeLog(`Otrzymano odpowiedź z serwera: ${travelTimeResp}`);
							if (travelTimeResp === travelTime) {
								wls.writeLog('Czas podróży zgadza się');
								return getCampaign();
							}
							return travelTimeResp;
						});
					}
				}
			}
			return Promise.resolve(null);
		} else {
			return getCampaign();
		}
	};

	return {
		handleResponse: (rd) => {
			const handleStart = function(responseData) {
				campaign = responseData;
				handleProductionTimeouts();
			};
			const handleGetDeposits = function(responseData) {
				depositStates = responseData.states;
			};
			switch (rd.requestMethod) {
			case 'start':
				handleStart(rd.responseData);
				break;
			case 'getDeposits':
				handleGetDeposits(rd.responseData);
				break;
			}
		},
		getServiceName: () => serviceName,
		process: () => {
			return processCampaign();
		},
		getCampaignData: () => campaign,
		isDeposit: deposit_id => !!_.find(depositStates, (v, k) => k === deposit_id && v === 2),
		getDepositStates: () => depositStates,
		reset: () => {
			wls.writeLog('Resetting campaign...');
			campaign = null;
		}
	};
};

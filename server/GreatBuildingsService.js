var util = require('../util');
var _ = require('lodash');

exports.get = (userData, apiService, definitionService, cityResourcesService, cityMapService, otherPlayerService) => {
	const serviceName = 'GreatBuildingsService';
	const wls = util.writeLogService(userData);

	wls.writeLog(`Creating service ${serviceName}`);

	var spendSpForGb = function(bldList) {
		var amountToSpend = 1;
		if (cityResourcesService.isPossibleToSpendSp()) {
			var gb = _(bldList).filter(o => {
				return o.type === 'greatbuilding' && o.state && (o.state.invested_forge_points || 0) < o.state.forge_points_for_level_up;
			}).orderBy(o => o.level || 0).first();
			if (gb) {
				const bd = definitionService.findBuildingDefinition(gb.cityentity_id);
				const player = otherPlayerService.findPlayer(gb.player_id);
				wls.writeLog(`Paying ${amountToSpend} forge points on Great Building ${bd.name} for player ${player.name}`);
				return apiService.doServerRequest(serviceName, [gb.id, gb.player_id, gb.level, amountToSpend], 'spendForgePoints');
			}
		}
		return util.getEmptyPromise(null);
	};

	var lastSpendSpForFriends = {};
	var processSpendSpForFriends = function() {
		util.intervalPromiseGuard(lastSpendSpForFriends, 180, () => {
			if (!cityResourcesService.isPossibleToSpendSp()) {
				return util.getEmptyPromise({});
			}

			var guildMemberList = _.filter(otherPlayerService.getNeighborList(), n => n.is_guild_member && n.player_id !== userData.playerId);
			if (guildMemberList.length) {
				var randomIndex = _.random(0, guildMemberList.length - 1);
				var gm = guildMemberList[randomIndex];
				wls.writeLog(`Found a guild member ${gm.name}`);
				return otherPlayerService.visitPlayer(gm.player_id).then(rd => spendSpForGb(rd.city_map.entities));
			}
			return util.getEmptyPromise({});
		});
	};


	return {
		handleResponse: () => {

		},
		getServiceName: () => serviceName,
		process: () => {
			return spendSpForGb(cityMapService.getBuildingList()).then(processSpendSpForFriends);
		},
		spendSpForGb
	};
};

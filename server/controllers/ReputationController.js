module.exports = function(core)
{
	var ReputationController =
	{
		PERMISSION:
		{
			SUBMIT_FLAGS: 0,
			EDIT_OWN_TRACKS: 5,
			OWN_PUBLIC_PLAYLISTS: 10,
			VOTE_RELATIONS_UP: 50,
			CREATE_RELATIONS: 75,
			VOTE_RELATIONS_DOWN: 100,
			AUTOCHECK_GUIDELINES: 200,
			VIEW_FLAGS: 500,
			EDIT_ALL_TRACKS: 1000,
			PROCESS_FLAGS: 2000,
		},
		ACTIVITY:
		{
			SUBMIT_FLAGS:
			{
				COST: 1,
			},
			EDIT_TRACKS:
			{
				COST: 1,
				REWARD: 1,
			},
			CREATE_RELATIONS:
			{
				COST: 1,
				REWARD: 1,
			},
		},
		ACTIVITY_LIMIT:
		{
			"0": 1,
			"10": 5,
			"20": 20,
			"75": 30,
			"150": 40,
			"250": 50,
			"500": 75,
			"1000": 100,
			"2000": 200,
		},
		VOTE_VALUE:
		{
			"0": 1,
			"500": 2,
			"1500": 3,
		},
		DAILY_LIMIT: 2,
	};

	var app = core.app;
	var sequelize = core.sequelize;
	var config = core.config;

	var Item = sequelize.models.Item;

	var isReputationEnabled = config.auth.reputation;
	var isDailyLimitEnabled = config.auth.limits;

	// Returns true if the user has permission for specified action
	ReputationController.hasPermission = function(user, action)
	{
		return (!isReputationEnabled ||
			(user.reputation >= action)
		);
	}

	// Returns true if the user can perform the specified activity
	ReputationController.canPerformActivity = function(user, activity)
	{
		if(!isDailyLimitEnabled)
			return true;

		var limit = ReputationController.getActivityLimit(user);
		return ( (user.activityToday + activity.COST) <= limit );
	}

	// Increment activity of the user and assign reward if necessary
	ReputationController.addActivity = function(user, activity, tr, done)
	{
		return user.increment
		({ activityToday: activity.COST },
		{ transaction: tr })
		.then(function()
		{
			if(activity.REWARD == null ||
				user.reputationToday >= ReputationController.DAILY_LIMIT)
					return done();

			var reward = Math.min(activity.REWARD,
				ReputationController.DAILY_LIMIT - user.reputationToday
			);

			return user.increment
			({
				reputation: reward,
				reputationToday: reward,
			},
			{ transaction: tr })
			.then(function()
			{
				return done();
			});
		});
	}

	// Returns day activity limit for the user specified
	ReputationController.getActivityLimit = function(user)
	{
		var limits = ReputationController.ACTIVITY_LIMIT;
		var limit = 0;

		for(var requirement in limits)
		{
			if( user.reputation < parseInt(requirement) )
				break;

			limit = limits[requirement];
		}

		return limit;
	}

	// Returns vote value for the user specified
	ReputationController.getVoteValue = function(user)
	{
		var voteValues = ReputationController.VOTE_VALUE;
		var voteValue = 1;

		for(var requirement in voteValues)
		{
			if( user.reputation < parseInt(requirement) )
				break;

			voteValue = voteValues[requirement];
		}

		return voteValue;
	}

	ReputationController.init = function()
	{

	}

	return ReputationController;
}

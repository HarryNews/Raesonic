var Reputation =
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
		VIEW_FLAG_COUNT: 300,
		VIEW_FLAGS: 500,
		EDIT_ALL_TRACKS: 1000,
		PROCESS_FLAGS: 2000,
	},
}

// Returns true if the user has permission for specified action
Reputation.hasPermission = function(action, unauthenticated)
{
	var Account = require("./Account.js");

	if(!Account.authenticated)
		return (unauthenticated || false);

	return (Account.own.reputation >= action);
}

module.exports = Reputation;

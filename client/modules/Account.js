var Account = {};

// Create a new user account
Account.create = function(nickname, password)
{
	$.ajax
	({
		url: "/signup/",
		type: "POST",
		data: JSON.stringify({ nickname: nickname, password: password }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Playlist.loadMain();
			// todo: update user menu
		}
	});
}

// Login into an existing account
Account.login = function(nickname, password)
{
	$.ajax
	({
		url: "/login/",
		type: "POST",
		data: JSON.stringify({ nickname: nickname, password: password }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Playlist.loadMain();
			// todo: update user menu
		}
	});
}

module.exports = Account;

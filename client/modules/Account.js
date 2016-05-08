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

			Account.init();
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

			Account.init();
		}
	});
}

// Logout from the account
Account.logout = function()
{
	$.ajax
	({
		url: "/logout/",
		type: "POST",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.init();
		}
	});
}

Account.init = function()
{
	// Obtain account details for current user
	$.ajax
	({
		url: "/own/account/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
			{
				Account.own = null;

				$("#user-name").text("Guest");
				$("#user-details").text("log in");
				$("#user-avatar").attr("src", "");
				
				return;
			}

			var account = response;

			Account.own =
			{
				userId: account[0],
				nickname: account[1],
				avatar: account[2],
				reputation: account[3]
			};

			$("#user-name").text(Account.own.nickname);
			$("#user-details").text("member");
			$("#user-avatar").attr("src", Account.own.avatar);

			Playlist.loadMain();
		}
	});
}

module.exports = Account;

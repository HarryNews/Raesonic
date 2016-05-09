var Account =
{
	authenticated: false,
};

// Create a new user account
Account.create = function(username, password)
{
	$.ajax
	({
		url: "/signup/",
		type: "POST",
		data: JSON.stringify({ username: username, password: password }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();
		}
	});
}

// Login into an existing account
Account.login = function(username, password)
{
	$.ajax
	({
		url: "/login/",
		type: "POST",
		data: JSON.stringify({ username: username, password: password }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();
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

			Account.sync();
		}
	});
}

// Update everything that depends on the account
Account.sync = function(done)
{
	// Obtain account details for current user
	$.ajax
	({
		url: "/own/account/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return Account.setAuthenticated(false, done);

			var account = response;

			Account.own =
			{
				userId: account[0],
				username: account[1],
				avatar: account[2],
				reputation: account[3]
			};

			Account.setAuthenticated(true, done);
			Playlist.loadMain();
		},
		error: function()
		{
			Account.setAuthenticated(false, done);
		}
	});
}

Account.setAuthenticated = function(isAuthenticated, done)
{
	if(!isAuthenticated)
	{
		Account.own = null;

		$("#user-name").text("Guest");
		$("#user-details").text("log in");
		$("#user-avatar").attr("src", "");
	}
	else
	{
		$("#user-name").text(Account.own.username);
		$("#user-details").text("member");
		$("#user-avatar").attr("src", Account.own.avatar);
	}

	Account.authenticated = isAuthenticated;

	var Overlay = require("./Overlay.js");
	Overlay.destroy();

	if(typeof done == "function")
		done();
}

// Creates and shows an overlay for authentication
Account.showLoginOverlay = function()
{
	var Overlay = require("./Overlay.js");

	if(Overlay.isActive())
		return;

	Overlay.create("Log in",
	[{
		tag: "<input>",
		id: "login-username",
		type: "text",
		maxlength: 30,
		placeholder: "Username",
		keyup: Account.updateLoginOverlay,
	},
	{
		tag: "<input>",
		id: "login-password",
		type: "password",
		maxlength: 200,
		placeholder: "Password",
		keyup: Account.updateLoginOverlay,
	}],
	function onOverlayCreate()
	{
		Account.updateLoginOverlay();
	});
}

// Creates and shows an overlay for account actions
Account.showAccountOverlay = function()
{
	var Overlay = require("./Overlay.js");

	if(Overlay.isActive())
		return;

	Overlay.create("Account",
	[
		// todo: change password
		// todo: change email
	],
	function onOverlayCreate()
	{
		Account.updateAccountOverlay();
	});
}

// Updates the login overlay
Account.updateLoginOverlay = function()
{
	var loginAllowed =
		( $("#login-username").val().length > 2 &&
			$("#login-password").val().length > 7 )
	
	var Overlay = require("./Overlay.js");

	loginAllowed
		? Overlay.setAction("Log in", Account.onLogInClick)
		: Overlay.setAction(null);
}

// Updates the account overlay
Account.updateAccountOverlay = function()
{
	var Overlay = require("./Overlay.js");
	Overlay.setAction("Logout", Account.onLogoutClick)
}

// Called upon clicking the user header
Account.onHeaderClick = function()
{
	Account.authenticated
		? Account.showAccountOverlay()
		: Account.showLoginOverlay();
}

// Called upon clicking the log in button
Account.onLogInClick = function()
{
	Account.login
	(
		$("#login-username").val(),
		$("#login-password").val()
	);
}

// Called upon clicking the log out button
Account.onLogoutClick = function()
{
	Account.logout();
}

Account.init = function(done)
{
	Account.sync(done);

	$("#header-right").click(Account.onHeaderClick);
}

module.exports = Account;

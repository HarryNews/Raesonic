var Overlay = require("./Overlay.js");

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
		},
		error: function(response)
		{
			var json = response.responseJSON;

			if(!json || !json.errors)
				return;

			var error = json.errors[0];

			if(error == "username not available")
				return Overlay.setError("#signup-username", "not available");

			// if(error == "internal error")
			// todo: show toast about the error, suggesting to try again later
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
		},
		error: function(response)
		{
			var json = response.responseJSON;

			if(!json || !json.errors)
				return;

			var error = json.errors[0];

			if(error == "username incorrect")
				return Overlay.setError("#login-username", "incorrect");

			if(error == "password incorrect")
				return Overlay.setError("#login-password", "incorrect");
		}
	});
}

// Send email with a link to reset password
Account.restore = function(username)
{
	$.ajax
	({
		url: "/restore/",
		type: "POST",
		data: JSON.stringify({ username: username }),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Overlay.onActionComplete("Email sent");
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

			var Playlist = require("./Playlist.js");
			Playlist.updateSection();
		},
		error: function()
		{
			Account.setAuthenticated(false, done);
		}
	});
}

// Set authentication state and update affected elements
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

	var Playlist = require("./Playlist.js");
	Playlist.onAccountSync();

	Overlay.destroy();

	if(typeof done == "function")
		done();
}

// Create and show an overlay for authentication
Account.showLoginOverlay = function()
{
	if(Overlay.isActive())
		return;

	Overlay.create("Log in",
	[{
		tag: "<input>",
		attributes:
		{
			id: "login-username",
			type: "text",
			maxlength: 30,
			placeholder: "Username",
		},
		keyup: Account.updateLoginOverlay,
	},
	{
		tag: "<input>",
		attributes:
		{
			id: "login-password",
			type: "password",
			maxlength: 200,
			placeholder: "Password",
		},
		keyup: Account.updateLoginOverlay,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "login-confirm",
			class: "inner window-link",
		},
		text: "Log In",
		click: Account.onLoginConfirmClick,
	},
	{
		tag: "<div>",
		attributes:
		{
			id: "login-create",
			class: "window-link",
		},
		text: "Sign Up",
		click: Account.onSignUpStartClick,
	}],
	function onOverlayCreate()
	{
		Account.updateLoginOverlay();
	});
}

// Create and show an overlay for account actions
Account.showAccountOverlay = function()
{
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

// Update the login overlay
Account.updateLoginOverlay = function()
{
	var restoreAllowed =
		( $("#login-username").val().length > 2 );
	
	restoreAllowed
		? Overlay.setAction("Forgot password", Account.onRestoreClick)
		: Overlay.setAction(null);

	Overlay.clearErrors();
}

// Update the sign up overlay
Account.updateSignUpOverlay = function()
{
	Overlay.clearErrors();

	if($("#signup-username").val().length > 0 &&
		!/^[a-z0-9]+$/i.test( $("#signup-username").val() ))
		Overlay.setError("#signup-username", "contains prohibited characters");
}

// Update the account overlay
Account.updateAccountOverlay = function()
{
	Overlay.setAction("Logout", Account.onLogoutClick)
}

// Called upon clicking the user header
Account.onHeaderClick = function()
{
	Account.authenticated
		? Account.showAccountOverlay()
		: Account.showLoginOverlay();
}

// Called upon clicking the login button on the login screen
Account.onLoginConfirmClick = function()
{
	if( $("#login-username").val().length < 3 )
		Overlay.setError("#login-username", "incorrect");

	if( $("#login-password").val().length < 8 )
		Overlay.setError("#login-password", "incorrect");

	if( Overlay.hasErrors() )
		return;

	Account.login
	(
		$("#login-username").val(),
		$("#login-password").val()
	);
}

// Called upon clicking the sign up button on the sign up screen
Account.onSignUpConfirmClick = function()
{
	if( $("#signup-username").val().length < 3 )
		Overlay.setError("#signup-username", "min. 3 characters");

	if($("#signup-username").val().length > 0 &&
		!/^[a-z0-9]+$/i.test( $("#signup-username").val() ))
		Overlay.setError("#signup-username", "contains prohibited characters");

	if( $("#signup-password").val().length < 8 )
		Overlay.setError("#signup-password", "min. 8 characters");

	if( $("#signup-repeat").val() != $("#signup-password").val() )
		Overlay.setError("#signup-repeat", "does not match");

	if( Overlay.hasErrors() )
		return;

	Account.create
	(
		$("#signup-username").val(),
		$("#signup-password").val()
	);
}

// Called upon clicking the sign up button on the login screen
// Transforms login window into a sign up window
Account.onSignUpStartClick = function()
{
	$("#window-header").text("Sign up");

	$("#login-username").attr("id", "signup-username");
	$("#login-password").attr("id", "signup-password");

	$("#signup-username, #signup-password")
		.unbind()
		.keyup(Account.updateSignUpOverlay);

	var $repeat = Overlay.createElement
	({
		tag: "<input>",
		attributes:
		{
			id: "signup-repeat",
			type: "password",
			maxlength: 200,
			placeholder: "Repeat Password",
		},
		keyup: Account.updateSignUpOverlay,
	});

	$("#signup-password").after($repeat.hide());
	$("#signup-repeat").slideDown(200);

	$("#login-confirm").slideUp(200, function()
	{
		$(this).remove();
	});

	var $existing = Overlay.createElement
	({
		tag: "<div>",
		attributes:
		{
			id: "signup-existing",
			class: "window-link",
		},
		text: "Log In",
		click: Account.onLoginStartClick,
	});

	$("#login-create")
		.attr("id", "signup-confirm")
		.addClass("inner")
		.unbind()
		.click(Account.onSignUpConfirmClick)
		.after($existing);

	$("#signup-existing")
		.hide()
		.delay(50)
		.slideDown(200);

	Overlay.setAction(null);
	Account.updateSignUpOverlay();
}

// Called upon clicking the login button on the sign up screen
// Transforms sign up window into a login window
Account.onLoginStartClick = function()
{
	$("#window-header").text("Log in");

	$("#signup-username").attr("id", "login-username");
	$("#signup-password").attr("id", "login-password");
	
	$("#login-username, #login-password")
		.unbind()
		.keyup(Account.updateLoginOverlay);

	$("#signup-repeat, #signup-confirm").slideUp(200, function()
	{
		$(this).remove();
	});

	var $create = Overlay.createElement
	({
		tag: "<div>",
		attributes:
		{
			id: "login-create",
			class: "window-link",
		},
		text: "Sign Up",
		click: Account.onSignUpStartClick,
	});

	$("#signup-existing")
		.attr("id", "login-confirm")
		.addClass("inner")
		.unbind()
		.click(Account.onLoginConfirmClick)
		.after($create);

	$("#login-create")
		.hide()
		.delay(50)
		.slideDown(200);

	Account.updateLoginOverlay();
}

// Called upon clicking the forgot password button
Account.onRestoreClick = function()
{
	Account.restore( $("#login-username").val() );
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

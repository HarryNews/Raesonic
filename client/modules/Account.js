var Throttle = require("throttle-debounce/throttle");
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
		data: JSON.stringify
		({
			username: username,
			password: password,
		}),
		contentType: "application/json",
		success: function(response)
		{
			if(response.errors)
				return;

			Account.sync();

			var Toast = require("./Toast.js");
			Toast.show("Account created successfully", Toast.INFO);
		},
		error: function(response)
		{
			var json = response.responseJSON;

			if(!json || !json.errors)
				return;

			var error = json.errors[0];

			if(error == "username not available")
				return Overlay.setError("#signup-username", "not available");
			
			var Toast = require("./Toast.js");

			if(error == "signup disabled")
			{
				Toast.show("Account creation is disabled, please try again later",
					Toast.ERROR);

				return;
			}

			Toast.onRequestError(response);
		}
	});
}
Account.createThrottled = Throttle(5000,
function(username, password)
{
	Account.create(username, password);
});

// Login into an existing account
Account.login = function(username, password)
{
	$.ajax
	({
		url: "/login/",
		type: "POST",
		data: JSON.stringify
		({
			username: username,
			password: password,
		}),
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
Account.loginThrottled = Throttle(5000,
function(username, password)
{
	Account.login(username, password);
});

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

			Overlay.onActionComplete("Temporarily unavailable");
			// Overlay.onActionComplete("Email sent");
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

// Update elements and values that depend on account status
Account.sync = function()
{
	// Obtain account details for current user
	$.ajax
	({
		url: "/own/account/",
		type: "GET",
		success: function(response)
		{
			if(response.errors)
				return Account.setAuthenticated(false);

			var account = response;

			Account.own =
			{
				userId: account[0],
				username: account[1],
				avatar: account[2],
				reputation: account[3]
			};

			Account.setAuthenticated(true);
		},
		error: function()
		{
			Account.setAuthenticated(false);
		}
	});
}

// Set authentication state and update affected elements
Account.setAuthenticated = function(isAuthenticated)
{
	$("#user-avatar").empty();

	if(!isAuthenticated)
	{
		Account.own = null;

		$("#user-name").text("Guest");
		$("#user-details").text("log in");
	}
	else
	{
		$("#user-name").text(Account.own.username);
		$("#user-details").text("member");

		$("#user-avatar").append(
			$("<img>")
				.attr("src", Account.own.avatar)
		);
	}

	Account.authenticated = isAuthenticated;
	Account.onSync();
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
		? Overlay.setAction("Forgot password",
			Account.onRestoreClickThrottled)
		: Overlay.setAction(null);

	Overlay.clearErrors();
}

// Update the sign up overlay
Account.updateSignUpOverlay = function()
{
	Overlay.clearErrors();

	var username = $("#signup-username").val();

	if( username.length > 0 && !/^[a-z0-9]+$/i.test(username) )
		Overlay.setError("#signup-username", "contains prohibited characters");
}

// Update the account overlay
Account.updateAccountOverlay = function()
{
	Overlay.setAction("Logout",
		Account.onLogoutClickThrottled);
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
	var username = $("#login-username").val();
	var password = $("#login-password").val();

	if(username.length < 3)
		Overlay.setError("#login-username", "incorrect");

	if(password.length < 8)
		Overlay.setError("#login-password", "incorrect");

	if( Overlay.hasErrors() )
		return;

	Account.loginThrottled(username, password);
}

// Called upon clicking the sign up button on the sign up screen
Account.onSignUpConfirmClick = function()
{
	var username = $("#signup-username").val();
	var password = $("#signup-password").val();
	var repeat = $("#signup-repeat").val();

	if(username.length < 3)
		Overlay.setError("#signup-username", "min. 3 characters");

	if( username.length > 0 && !/^[a-z0-9]+$/i.test(username) )
		Overlay.setError("#signup-username", "contains prohibited characters");

	if(password.length < 8)
		Overlay.setError("#signup-password", "min. 8 characters");

	if(repeat != password)
		Overlay.setError("#signup-repeat", "does not match");

	if( Overlay.hasErrors() )
		return;

	Account.createThrottled(username, password);
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
Account.onRestoreClickThrottled =
Throttle(5000, function()
{
	Account.onRestoreClick();
});

// Called upon clicking the log out button
Account.onLogoutClick = function()
{
	Account.logout();
}
Account.onLogoutClickThrottled =
Throttle(5000, function()
{
	Account.onLogoutClick();
});

Account.init = function(onSync)
{
	Account.onSync = onSync;
	Account.sync();

	$("#header-right").click(Account.onHeaderClick);
}

module.exports = Account;
